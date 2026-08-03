#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
    Levanta TrustAI en local de punta a punta (infra + API + web).

.DESCRIPTION
    Replica el arranque manual completo, de forma idempotente:
      1. Verifica Node y pnpm.
      2. Arranca Docker Desktop si el engine no responde y espera a que este listo.
      3. Copia los .env desde .env.example si faltan y genera ASSET_ENCRYPTION_KEY si esta vacio.
      4. docker compose up -d (Postgres + MinIO) y espera a que esten healthy.
      5. Crea el bucket S3 en MinIO (idempotente).
      6. Compila @trustai/dtr-core (del que dependen api y web).
      7. Aplica el esquema Prisma (db:deploy).
      8. Arranca la API en background y espera /health.
      9. Siembra el usuario demo.
     10. Arranca el web en background y espera HTTP 200.

    Los servidores corren en procesos ocultos; sus logs y PIDs quedan en
    $env:TEMP\trustai. Para pararlos usa dev-down.ps1.

.PARAMETER SkipInfra
    No toca Docker ni docker compose (asume Postgres/MinIO ya arriba).

.PARAMETER SkipSeed
    No siembra el usuario demo.

.PARAMETER NoBuild
    No recompila @trustai/dtr-core.

.EXAMPLE
    .\dev-up.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipInfra,
    [switch]$SkipSeed,
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$ComposeFile = Join-Path $Root 'infrastructure\docker-compose.yml'
$RunDir = Join-Path $env:TEMP 'trustai'
$ApiLog = Join-Path $RunDir 'api.log'
$WebLog = Join-Path $RunDir 'web.log'
$ApiPidFile = Join-Path $RunDir 'api.pid'
$WebPidFile = Join-Path $RunDir 'web.pid'
$WebPort = 3100
$DockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

# ---------- helpers ----------
function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "    --  $msg" -ForegroundColor DarkGray }
function Write-Warn($msg)  { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg)        { Write-Host "`nERROR: $msg" -ForegroundColor Red; exit 1 }

function Get-EnvValue($path, $key) {
    if (-not (Test-Path $path)) { return $null }
    $line = Get-Content $path | Where-Object { $_ -match "^\s*$([regex]::Escape($key))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split '=', 2)[1].Trim().Trim('"')
}

function Test-HttpOk($url) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Wait-For([string]$label, [scriptblock]$check, [int]$retries = 40, [int]$delaySec = 3) {
    for ($i = 0; $i -lt $retries; $i++) {
        if (& $check) { return $true }
        Start-Sleep -Seconds $delaySec
    }
    return $false
}

# ---------- 1. tooling ----------
Write-Step 'Verificando Node y pnpm'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node no encontrado (se requiere >=22).' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail 'pnpm no encontrado (se requiere 11.9.0).' }
Write-Ok "node $(node --version) / pnpm $(pnpm --version)"

# ---------- 2. env files ----------
Write-Step 'Verificando archivos .env'
foreach ($app in @('api', 'web')) {
    $envPath = Join-Path $Root "apps\$app\.env"
    $examplePath = Join-Path $Root "apps\$app\.env.example"
    if (-not (Test-Path $envPath)) {
        if (Test-Path $examplePath) {
            Copy-Item $examplePath $envPath
            Write-Warn "apps\$app\.env no existia: copiado desde .env.example (revisa los valores)."
        } else {
            Write-Warn "apps\$app\.env y .env.example no existen."
        }
    } else {
        Write-Ok "apps\$app\.env presente"
    }
}

# Asegura ASSET_ENCRYPTION_KEY en api/.env (32 bytes base64) o la API no arranca.
$apiEnvPath = Join-Path $Root 'apps\api\.env'
if (Test-Path $apiEnvPath) {
    $encKey = Get-EnvValue $apiEnvPath 'ASSET_ENCRYPTION_KEY'
    if ([string]::IsNullOrWhiteSpace($encKey)) {
        $newKey = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
        $content = Get-Content $apiEnvPath -Raw
        if ($content -match '(?m)^\s*ASSET_ENCRYPTION_KEY=') {
            $content = $content -replace '(?m)^\s*ASSET_ENCRYPTION_KEY=.*$', "ASSET_ENCRYPTION_KEY=$newKey"
        } else {
            $content = $content.TrimEnd() + "`nASSET_ENCRYPTION_KEY=$newKey`n"
        }
        Set-Content -Path $apiEnvPath -Value $content -NoNewline
        Write-Warn 'ASSET_ENCRYPTION_KEY estaba vacia: generada una nueva.'
    } else {
        Write-Ok 'ASSET_ENCRYPTION_KEY configurada'
    }
}

$apiPort = Get-EnvValue $apiEnvPath 'PORT'
if ([string]::IsNullOrWhiteSpace($apiPort)) { $apiPort = '3000' }
$apiHealthUrl = "http://localhost:$apiPort/health"

# ---------- 3. infraestructura ----------
if (-not $SkipInfra) {
    Write-Step 'Verificando Docker'
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Info 'Engine sin responder. Arrancando Docker Desktop...'
        if (Test-Path $DockerDesktop) { Start-Process $DockerDesktop } else { Fail "Docker Desktop no encontrado en $DockerDesktop" }
        $ready = Wait-For 'docker' { docker info *> $null; $LASTEXITCODE -eq 0 } 40 3
        if (-not $ready) { Fail 'El engine de Docker no respondio a tiempo.' }
    }
    Write-Ok 'Docker engine listo'

    Write-Step 'Levantando Postgres + MinIO (docker compose)'
    docker compose -f $ComposeFile up -d
    if ($LASTEXITCODE -ne 0) { Fail 'docker compose up fallo.' }

    foreach ($svc in @('postgres', 'minio')) {
        $cid = (docker compose -f $ComposeFile ps -q $svc).Trim()
        if (-not $cid) { Fail "No se encontro el contenedor del servicio '$svc'." }
        $healthy = Wait-For $svc {
            $status = (docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $cid 2>$null)
            $status -eq 'healthy'
        } 20 3
        if (-not $healthy) { Fail "El servicio '$svc' no llego a estado healthy." }
        Write-Ok "$svc healthy"
    }

    # ---------- 4. bucket MinIO ----------
    Write-Step 'Creando bucket en MinIO'
    $bucket = Get-EnvValue $apiEnvPath 'S3_BUCKET'
    if ([string]::IsNullOrWhiteSpace($bucket)) {
        Write-Warn 'S3_BUCKET no definido en api/.env; salto la creacion del bucket.'
    } else {
        $minioId = (docker compose -f $ComposeFile ps -q minio).Trim()
        docker exec $minioId sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1; mc mb -p local/$bucket 2>&1 || true" | Out-Null
        Write-Ok "bucket '$bucket' listo"
    }
} else {
    Write-Step 'Infra: omitida (--SkipInfra)'
}

# ---------- 5. build core ----------
if (-not $NoBuild) {
    Write-Step 'Compilando @trustai/dtr-core'
    pnpm --filter '@trustai/dtr-core' build
    if ($LASTEXITCODE -ne 0) { Fail 'La build de dtr-core fallo.' }
    Write-Ok 'dtr-core compilado'
} else {
    Write-Step 'Build de dtr-core: omitida (--NoBuild)'
}

# ---------- 6. esquema DB ----------
Write-Step 'Aplicando esquema de base de datos (prisma db push)'
pnpm --filter '@trustai/api' db:deploy
if ($LASTEXITCODE -ne 0) { Fail 'db:deploy fallo (revisa DATABASE_URL y que Postgres este arriba).' }
Write-Ok 'Esquema sincronizado'

# ---------- 7. API ----------
Write-Step "Arrancando API ($apiHealthUrl)"
if (Test-HttpOk $apiHealthUrl) {
    Write-Info 'La API ya responde: no lanzo una instancia nueva.'
} else {
    if (Test-Path $ApiLog) { Remove-Item $ApiLog -Force }
    $cmd = "pnpm --filter '@trustai/api' start:dev *> '$ApiLog'"
    $proc = Start-Process pwsh -PassThru -WindowStyle Hidden -WorkingDirectory $Root -ArgumentList '-NoProfile', '-Command', $cmd
    $proc.Id | Set-Content -Path $ApiPidFile
    Write-Info "PID $($proc.Id) | log: $ApiLog"
    $up = Wait-For 'api' { Test-HttpOk $apiHealthUrl } 40 3
    if (-not $up) {
        Write-Warn 'La API no respondio a /health. Ultimas lineas del log:'
        if (Test-Path $ApiLog) { Get-Content $ApiLog -Tail 40 }
        Fail 'Arranque de la API fallido.'
    }
}
Write-Ok 'API respondiendo'

# ---------- 8. seed demo ----------
if (-not $SkipSeed) {
    Write-Step 'Sembrando usuario demo'
    pnpm --filter '@trustai/api' seed:demo
    if ($LASTEXITCODE -ne 0) { Write-Warn 'El seed fallo (no bloquea el arranque).' } else { Write-Ok 'Usuario demo listo' }
} else {
    Write-Step 'Seed: omitido (--SkipSeed)'
}

# ---------- 9. web ----------
Write-Step "Arrancando web (http://localhost:$WebPort)"
if (Test-HttpOk "http://localhost:$WebPort") {
    Write-Info 'El web ya responde: no lanzo una instancia nueva.'
} else {
    if (Test-Path $WebLog) { Remove-Item $WebLog -Force }
    $cmd = "pnpm --filter '@trustai/web' dev *> '$WebLog'"
    $proc = Start-Process pwsh -PassThru -WindowStyle Hidden -WorkingDirectory $Root -ArgumentList '-NoProfile', '-Command', $cmd
    $proc.Id | Set-Content -Path $WebPidFile
    Write-Info "PID $($proc.Id) | log: $WebLog"
    $up = Wait-For 'web' { Test-HttpOk "http://localhost:$WebPort" } 40 3
    if (-not $up) {
        Write-Warn 'El web no respondio. Ultimas lineas del log:'
        if (Test-Path $WebLog) { Get-Content $WebLog -Tail 40 }
        Fail 'Arranque del web fallido.'
    }
}
Write-Ok 'Web respondiendo'

# ---------- resumen ----------
$demoEmail = Get-EnvValue $apiEnvPath 'DEMO_EMAIL'; if (-not $demoEmail) { $demoEmail = 'revisor@trustai.app' }
$demoPass  = Get-EnvValue $apiEnvPath 'DEMO_PASSWORD'; if (-not $demoPass) { $demoPass = 'RevisorTFM2026' }

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " TrustAI corriendo en local" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Web    : http://localhost:$WebPort"
Write-Host "  API    : $apiHealthUrl"
Write-Host "  MinIO  : http://localhost:9000  (consola http://localhost:9001, minioadmin/minioadmin)"
Write-Host ""
Write-Host "  Login demo:  $demoEmail  /  $demoPass"
Write-Host ""
Write-Host "  Logs   : $ApiLog"
Write-Host "           $WebLog"
Write-Host "  Ver en vivo:  Get-Content '$ApiLog' -Wait"
Write-Host "  Parar todo :  .\dev-down.ps1"
Write-Host "============================================================`n" -ForegroundColor Green
