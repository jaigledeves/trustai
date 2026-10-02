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
| `CORS_ORIGINS` | sí (prod) | Orígenes permitidos, separados por coma (p. ej. `https://ancrux.vercel.app`). Sin valor solo se permite `http://localhost:3100` y la API lo avisa en el log al arrancar; el comodín `*` se ignora y la barra final se elimina. Lo necesita la verificación pública, que llama a la API desde el navegador. |
| `DATABASE_URL` | sí | Referencia al Postgres de Railway. |
| `TRUSTED_PROXY_SECRET` | sí (prod, secreto) | Cadena larga aleatoria, con el mismo valor en Railway y en Vercel. La API solo confía en la IP de cliente reenviada por el web (`x-client-ip`) para el rate limiting cuando el secreto coincide; si no, usa la IP de conexión, que para el tráfico del web es la de salida de Vercel y la comparten todos los usuarios. Si falta, la API lo avisa en el log al arrancar. |
| `PGBOSS_SCHEMA` | no | Schema de pg-boss (default interno). |
| `JWT_SECRET` | sí (secreto) | Cadena larga aleatoria. Sin valor por defecto: la API no arranca si falta o si conserva el placeholder de `.env.example`. |
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
| `AUTH_THROTTLE_LIMIT` | no | Intentos por minuto y por cuenta (email) en `POST /auth/login` y `POST /auth/forgot-password` (default 5). Frena la fuerza bruta contra una cuenta concreta. Este límite por cuenta se aplica además del límite global por IP (`THROTTLE_LIMIT`), no lo reemplaza. Un valor vacío, no entero o menor que 1 se ignora y se usa 5. |

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
| `NEXT_PUBLIC_APP_BASE_URL` | sí (prod) | Origen público del propio web (p. ej. `https://ancrux.vercel.app`). Se usa para construir el enlace absoluto y el QR de verificación pública en el detalle del DTR. Default dev: `http://localhost:3100`. |
| `NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED` | no | `true` para mostrar la página de verificación pública. |
| `NEXT_PUBLIC_DEMO_DTR_ID` | no | `id` de un DTR ya `CERTIFIED`. Si está seteada, la landing muestra un CTA "Ver una verificación de ejemplo" que enlaza a `/verify/:id` (probar sin registro). Debe existir y persistir en la base del entorno. |
| `TRUSTED_PROXY_SECRET` | sí (prod, secreto) | Mismo valor que en la API (Railway); cadena larga aleatoria. Solo server-side, nunca `NEXT_PUBLIC_`. El web reenvía con él la IP real del cliente para que la API limite por cliente y no por la IP de salida de Vercel. |
| `SESSION_COOKIE_NAME` | no | Default `trustai_session`. |

## Cloudflare R2

1. Crear un bucket (p. ej. `trustai-assets`).
2. Crear un API Token R2 (Access Key + Secret) con permisos de objeto sobre el bucket.
3. `S3_ENDPOINT` = `https://<accountid>.r2.cloudflarestorage.com`, `S3_FORCE_PATH_STYLE=true`.

## CORS

`main.ts` solo permite los orígenes de `CORS_ORIGINS` (ver la tabla de
variables de la API).

## Cabeceras de seguridad

| App | Cabeceras | Nota |
|---|---|---|
| API (`apps/api/src/security-headers.ts`) | `helmet` con sus valores por defecto (HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, políticas `Cross-Origin-*`, sin `X-Powered-By`) y una CSP con `frame-ancestors 'none'` | La CSP admite estilos inline e imágenes `data:` para que Swagger UI (`/api-docs`) funcione; los scripts solo pueden venir de `'self'`. Se omite `upgrade-insecure-requests` porque el TLS lo termina Railway y en local rompe Swagger sobre HTTP. |
| Web (`apps/web/lib/security-headers.ts`, aplicado en `next.config.ts` a todas las rutas) | `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono, geolocalización, pagos, USB y similares deshabilitados) | `connect-src` admite `'self'` y el origen de `NEXT_PUBLIC_API_BASE_URL`, que se lee **en el build**: debe estar definida en Vercel al construir, o la verificación pública (`/verify`) no podrá llamar a la API. |

Limitación conocida: sin nonces, Next.js necesita `script-src 'unsafe-inline'`
para sus scripts inline de arranque e hidratación, por lo que la CSP del web no
frena scripts inline inyectados. `'unsafe-eval'` solo se añade en desarrollo
(`next dev`). Una CSP con nonce por petición queda como paso posterior.

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
re-ejecutarlo sobre una cuenta existente solo la re-verifica. Las credenciales
por defecto del script son solo para desarrollo local. Contra producción,
definir siempre `DEMO_EMAIL` y `DEMO_PASSWORD` con valores no publicados:
el repositorio es público y los valores por defecto son visibles. Requiere que la API esté desplegada y el
`DATABASE_URL` apunte al Postgres de Railway.

## Checklist de corte

- [x] Contrato en Base Sepolia accesible (`isAnchored` responde) — verificado con el e2e "live" (`apps/api/test/anchor-basesepolia.e2e-spec.ts`, gateado por credenciales reales) y el recibo de despliegue en `smart-contracts/broadcast/Deploy.s.sol/84532/run-latest.json`.
- [ ] Postgres de Railway migrado (`db:deploy` en release).
- [ ] Bucket R2 creado y credenciales cargadas.
- [ ] API `/health` responde 200 en su URL pública.
- [ ] Web carga y `API_BASE_URL` apunta a la API.
- [ ] Golden path end-to-end: registrar → verificar → certificar → CERTIFIED con tx en basescan.
- [ ] Usuario de prueba sembrado (`pnpm --filter @trustai/api seed:demo`) con credenciales no publicadas y login verificado.

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
- CSP del web basada en nonces (eliminar `script-src 'unsafe-inline'`).
- Gestión de secretos: la private key del worker pasa a variables de plataforma; considerar un secrets manager pre-mainnet.
- Separar el worker en su propio servicio si crece la carga (ver ADR-006 seguimiento).
