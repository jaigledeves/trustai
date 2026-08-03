#!/usr/bin/env pwsh
#Requires -Version 7.0
<#
.SYNOPSIS
    Detiene el stack local de TrustAI arrancado con dev-up.ps1.

.DESCRIPTION
    Para los servidores de API y web (por PID guardado y, como respaldo,
    liberando los puertos 3000/3100) y detiene los contenedores de Docker.
    Por defecto conserva los datos (docker compose stop). Usa -Full para
    eliminar contenedores y red (docker compose down); agrega -Volumes para
    borrar tambien los datos de Postgres y MinIO.

.PARAMETER Full
    Ejecuta 'docker compose down' (elimina contenedores y red).

.PARAMETER Volumes
    Junto con -Full, agrega -v para borrar los volumenes (DATOS PERDIDOS).

.PARAMETER KeepInfra
    No toca Docker; solo detiene API y web.

.EXAMPLE
    .\dev-down.ps1

.EXAMPLE
    .\dev-down.ps1 -Full -Volumes
#>
[CmdletBinding()]
param(
    [switch]$Full,
    [switch]$Volumes,
    [switch]$KeepInfra
)

$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot
$ComposeFile = Join-Path $Root 'infrastructure\docker-compose.yml'
$RunDir = Join-Path $env:TEMP 'trustai'
$ApiPidFile = Join-Path $RunDir 'api.pid'
$WebPidFile = Join-Path $RunDir 'web.pid'

$apiEnvPath = Join-Path $Root 'apps\api\.env'
$apiPort = 3000
if (Test-Path $apiEnvPath) {
    $line = Get-Content $apiEnvPath | Where-Object { $_ -match '^\s*PORT=' } | Select-Object -First 1
    if ($line) { $v = ($line -split '=', 2)[1].Trim().Trim('"'); if ($v) { $apiPort = [int]$v } }
}
$ports = @($apiPort, 3100)

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    --  $msg" -ForegroundColor DarkGray }

function Stop-Tree($procId, $label) {
    if (-not $procId) { return }
    if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
        taskkill /PID $procId /T /F *> $null
        Write-Ok "$label detenido (PID $procId + hijos)"
    } else {
        Write-Info "$label (PID $procId) ya no estaba activo"
    }
}

# Sube por la cadena de padres mientras sean procesos del arbol de dev
# (node/pnpm/cmd/pwsh cuyo comando referencia a TrustAI). Devuelve el PID
# raiz para matar el arbol completo y evitar el respawn de ts-node-dev.
function Get-DevTreeRoot($startPid) {
    $safeNames = @('node.exe', 'cmd.exe', 'pwsh.exe', 'powershell.exe')
    $pattern = 'start:dev|next|ts-node-dev|--filter|@trustai'
    $rootPid = [int]$startPid
    $current = [int]$startPid
    while ($true) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
        if (-not $proc -or -not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)" -ErrorAction SilentlyContinue
        if (-not $parent) { break }
        if ($parent.ProcessId -eq $PID) { break }  # nunca subir hasta este propio script
        if (($safeNames -contains $parent.Name) -and ("$($parent.CommandLine)" -match $pattern)) {
            $rootPid = [int]$parent.ProcessId
            $current = [int]$parent.ProcessId
        } else {
            break
        }
    }
    return $rootPid
}

# 1. Por PID guardado (mata el arbol de procesos: pwsh -> pnpm -> node)
Write-Step 'Deteniendo servidores por PID guardado'
foreach ($f in @(@{p = $ApiPidFile; l = 'API' }, @{p = $WebPidFile; l = 'web' })) {
    if (Test-Path $f.p) {
        $procId = (Get-Content $f.p | Select-Object -First 1)
        Stop-Tree ([int]$procId) $f.l
        Remove-Item $f.p -Force -ErrorAction SilentlyContinue
    } else {
        Write-Info "Sin pidfile para $($f.l)"
    }
}

# 2. Respaldo: libera los puertos por si quedaron procesos huerfanos
Write-Step "Liberando puertos $($ports -join ', ')"
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                $rootPid = Get-DevTreeRoot $procId   # mata desde la raiz (evita respawn de ts-node-dev)
                taskkill /PID $rootPid /T /F *> $null
                if ($rootPid -ne $procId) {
                    Write-Ok "Puerto $port liberado (PID $procId, arbol raiz $rootPid)"
                } else {
                    Write-Ok "Puerto $port liberado (PID $procId)"
                }
            }
        }
        if (-not $pids) { Write-Info "Puerto $port ya libre" }
    } catch { Write-Info "Puerto $port ya libre" }
}

# 3. Docker
if ($KeepInfra) {
    Write-Step 'Docker: omitido (--KeepInfra)'
} elseif (Test-Path $ComposeFile) {
    if ($Full) {
        if ($Volumes) {
            Write-Step 'docker compose down -v (ELIMINA DATOS)'
            docker compose -f $ComposeFile down -v
        } else {
            Write-Step 'docker compose down (conserva volumenes)'
            docker compose -f $ComposeFile down
        }
    } else {
        Write-Step 'docker compose stop (conserva contenedores y datos)'
        docker compose -f $ComposeFile stop
    }
    Write-Ok 'Contenedores detenidos'
}

Write-Host "`nStack local detenido.`n" -ForegroundColor Green
