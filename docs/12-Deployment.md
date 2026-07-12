# 12 - Deployment (MVP)

Runbook de despliegue del MVP. Stack decidido en **ADR-006**: **Vercel** (web) +
**Railway** (API + Postgres) + **Cloudflare R2** (object storage), contra **Base
Sepolia** (contrato ya desplegado: `0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22`).

## Topología

```
Navegador ──> Vercel (apps/web, Next.js)
                  │  server-side (RSC / route handlers, Bearer + cookie httpOnly)
                  ▼
             Railway (apps/api, NestJS + worker pg-boss in-process)
                  ├─> Railway Postgres  (datos + cola pg-boss)
                  ├─> Cloudflare R2      (activos cifrados, S3-compatible)
                  └─> Base Sepolia RPC   (anclaje on-chain)
```

Restricción clave (ADR-006): la API **no es serverless** — el worker in-process
debe estar always-on. Por eso va en Railway (proceso caliente), no en funciones
serverless.

## API en Railway

- **Build**: Dockerfile `apps/api/Dockerfile` con **build context = raíz del repo**
  (monorepo: necesita lockfile, `pnpm-workspace.yaml` y `@trustai/dtr-core`).
- **Start**: `node dist/main.js` (CMD del Dockerfile).
- **Pre-deploy / release** (aplica el schema): `pnpm --filter @trustai/api db:deploy`
  (`prisma db push --skip-generate`; el client ya se generó en el build).
- **Postgres**: servicio Railway Postgres; referenciar su `DATABASE_URL` en la API.

### Variables de entorno (API)

| Variable | Requerida | Valor / nota |
|---|---|---|
| `PORT` | sí | La inyecta Railway; `main.ts` la lee (default 3000). |
| `DATABASE_URL` | sí | Referencia al Postgres de Railway. |
| `PGBOSS_SCHEMA` | no | Schema de pg-boss (default interno). |
| `JWT_SECRET` | sí (secreto) | Cadena larga aleatoria. |
| `JWT_EXPIRES_IN` | no | p. ej. `7d` (debe cuadrar con `sessionMaxAgeSeconds` del web). |
| `ASSET_ENCRYPTION_KEY` | sí (secreto) | **base64 de 32 bytes** (AES-256-GCM). Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `S3_ENDPOINT` | sí | Endpoint R2: `https://<accountid>.r2.cloudflarestorage.com`. |
| `S3_REGION` | no | `auto` para R2 (default en código `us-east-1`). |
| `S3_BUCKET` | sí | Nombre del bucket R2. |
| `S3_ACCESS_KEY` | sí (secreto) | Access key del token R2. |
| `S3_SECRET_KEY` | sí (secreto) | Secret key del token R2. |
| `S3_FORCE_PATH_STYLE` | sí | `true` (R2 requiere path-style). |
| `CHAIN_RPC_URL` | sí | `https://sepolia.base.org`. |
| `ANCHOR_CONTRACT_ADDRESS` | sí | `0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22`. |
| `WORKER_WALLET_PRIVATE_KEY` | sí (secreto) | Clave de la wallet que firma/paga el gas. |
| `CHAIN_ID` | no | `84532` (default). |
| `CHAIN_NETWORK` / `CHAIN_EXPLORER_BASE_URL` | no | Metadatos de red/explorer (links). |
| `AI_ADAPTER` | no | `stub` (default) o `openai`. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | si `openai` | Solo si `AI_ADAPTER=openai`. |
| `PUBLIC_VERIFICATION_ENABLED` | no | `true` para habilitar UC-02 (verificación pública). |
| `PUBLIC_VERIFY_GET_THROTTLE_LIMIT` / `..._POST_...` | no | Rate limits del endpoint público. |

## Web en Vercel

- **Root Directory**: `apps/web`.
- **Install Command**: la de Vercel (detecta pnpm workspace en la raíz).
- **Build Command** (override): `pnpm --filter @trustai/dtr-core build && pnpm --filter @trustai/web build`
  (hay que construir `dtr-core` antes que el web).
- **Output**: Next.js por defecto.

### Variables de entorno (web)

| Variable | Requerida | Valor / nota |
|---|---|---|
| `API_BASE_URL` | sí | URL pública de la API en Railway (server-side). |
| `NEXT_PUBLIC_API_BASE_URL` | sí | Misma URL (verificación pública llama directo, sin auth). |
| `NEXT_PUBLIC_CHAIN_EXPLORER_BASE_URL` | no | `https://sepolia.basescan.org` (default). |
| `NEXT_PUBLIC_APP_BASE_URL` | sí (prod) | Origen público del propio web (p. ej. `https://trustai-web-kappa.vercel.app`). Se usa para construir el enlace absoluto y el QR de verificación pública en el detalle del DTR. Default dev: `http://localhost:3100`. |
| `NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED` | no | `true` para mostrar la página de verificación pública. |
| `NEXT_PUBLIC_DEMO_DTR_ID` | no | `id` de un DTR ya `CERTIFIED`. Si está seteada, la landing muestra un CTA "Ver una verificación de ejemplo" que enlaza a `/verify/:id` (probar sin registro). Debe existir y persistir en la base del entorno. |
| `SESSION_COOKIE_NAME` | no | Default `trustai_session`. |

## Cloudflare R2

1. Crear un bucket (p. ej. `trustai-assets`).
2. Crear un API Token R2 (Access Key + Secret) con permisos de objeto sobre el bucket.
3. `S3_ENDPOINT` = `https://<accountid>.r2.cloudflarestorage.com`, `S3_FORCE_PATH_STYLE=true`.

## CORS

`main.ts` hace `app.enableCors()` (permisivo, todos los orígenes). Suficiente para
el MVP; endurecer al dominio del web de Vercel antes de un uso serio.

## Usuario de prueba (demo para el revisor)

El adaptador de notificación en el MVP (`StubNotificationAdapter`) solo
escribe el token de verificación en los logs, no envía un email real. Para
que un revisor pueda entrar sin ese paso, se siembra una cuenta ya
verificada con:

```powershell
$env:API_BASE_URL="https://trustaiapi-production.up.railway.app"
$env:DATABASE_URL="<DATABASE_URL de Railway>"
pnpm --filter @trustai/api seed:demo
```

El script (`apps/api/scripts/seed-demo-user.mjs`) registra la cuenta contra
la API real (hashing argon2 + creación de Organization/User por el código
real) y luego marca `emailVerified = true` vía Prisma. Es idempotente:
re-ejecutarlo sobre una cuenta existente solo la re-verifica. Credenciales
por defecto (`DEMO_EMAIL` / `DEMO_PASSWORD` las sobreescriben): las
publicadas en el README raíz. Requiere que la API esté desplegada y el
`DATABASE_URL` apunte al Postgres de Railway.

## Checklist de corte

- [x] Contrato en Base Sepolia accesible (`isAnchored` responde) — verificado con el e2e "live" (`apps/api/test/anchor-basesepolia.e2e-spec.ts`, gateado por credenciales reales) y el recibo de despliegue en `smart-contracts/broadcast/Deploy.s.sol/84532/run-latest.json`.
- [ ] Postgres de Railway migrado (`db:deploy` en release).
- [ ] Bucket R2 creado y credenciales cargadas.
- [ ] API `/health` responde 200 en su URL pública.
- [ ] Web carga y `API_BASE_URL` apunta a la API.
- [ ] Golden path end-to-end: registrar → verificar → certificar → CERTIFIED con tx en basescan.
- [ ] Usuario de prueba sembrado (`pnpm --filter @trustai/api seed:demo`) y login verificado con las credenciales del README.

Endpoints reales expuestos por la API en este despliegue:
[`docs/api/endpoints.md`](api/endpoints.md).

## Precondiciones de runtime

El checklist de corte confirma que los servicios responden; estas
precondiciones son las que hacen que el **flujo end-to-end** funcione en
vivo. Son las que más se olvidan y las que rompen una demo aunque
`/health` devuelva 200.

### Deben estar vivas

- **API (Railway)** respondiendo `/health` 200 en su URL pública.
- **Web (Vercel)** cargando, con `API_BASE_URL` apuntando a la API.
- **Contrato `AnchorRegistry` en Base Sepolia** accesible
  (`0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22`).
- **Postgres (Railway)** con el schema aplicado (`db:deploy` en release).
  Si se resetea la base, hay que reaplicarlo.
- **Wallet del worker con saldo de ETH de testnet (Base Sepolia).** Sin
  gas, el anclaje falla y **ningún DTR llega a `CERTIFIED`**. Recargar en
  un faucet de Base Sepolia antes de cualquier demostración.

### Deben estar configuradas

- API: `PUBLIC_VERIFICATION_ENABLED=true` (necesario para UC-02 y para el
  DTR de ejemplo enlazado desde la landing).
- API: si `AI_ADAPTER=openai`, la `OPENAI_API_KEY` debe ser válida y con
  crédito; en caso contrario, `stub` cubre la demo.
- Web: `NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED=true` y
  `NEXT_PUBLIC_APP_BASE_URL` con el origen público (enlace absoluto y QR).

### Datos sembrados

- Usuario revisor sembrado contra producción (`seed:demo` con
  `API_BASE_URL` y `DATABASE_URL` de Railway).
- DTR de ejemplo ya `CERTIFIED` cuyo `id` alimenta el CTA de verificación
  de la landing (`NEXT_PUBLIC_DEMO_DTR_ID`).

### Gotchas que rompen la demo

1. **Gas del worker agotado** → no hay `CERTIFIED`. Revisar saldo antes
   de demostrar.
2. **OpenAI sin crédito** (si `AI_ADAPTER=openai`) → falla la revisión
   IA. El `stub` es el plan B.
3. **Base reseteada** → se pierden schema, usuario revisor y DTR de
   ejemplo. Rehacer `db:deploy` + `seed:demo` + regenerar el DTR y su
   `id`.

## Pendientes / follow-ups

- Migraciones Prisma formales (hoy `db push`) antes de producción con datos reales.
- Endurecer CORS al dominio del web.
- Gestión de secretos: la private key del worker pasa a variables de plataforma; considerar un secrets manager pre-mainnet.
- Separar el worker en su propio servicio si crece la carga (ver ADR-006 seguimiento).
