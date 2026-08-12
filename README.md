# TrustAI

Certificación inteligente de activos digitales: **la IA comprende el
contenido, la blockchain certifica su integridad**. Cada activo obtiene
un **Digital Trust Record (DTR)** verificable, cuyo hash canónico queda
anclado on-chain.

> **Estado:** MVP completo y desplegado en producción. El flujo completo
> (registro → verificación de email → login → subida → revisión con IA →
> anclaje on-chain → `CERTIFIED`) está probado de punta a punta contra
> **Base Sepolia real**.

Proyecto de Trabajo Fin de Máster (TFM). Este repositorio es el
entregable completo: el código fuente **y** la documentación viva de
producto e ingeniería, en [`docs/`](docs/TDD-Index.md).

---

## Demo en vivo

| Recurso | URL |
|---|---|
| Aplicación web | https://ancrux.vercel.app |
| Salud de la API | https://trustaiapi-production.up.railway.app/health |
| Contrato de anclaje (Base Sepolia) | [`0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22`](https://sepolia.basescan.org/address/0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22) |

### Credenciales de prueba

Usa estas credenciales para entrar a la aplicación web y ejecutar el
flujo de certificación:

```
Email:    revisor@trustai.app
Password: RevisorTFM2026
```

> Esta cuenta se crea con `pnpm --filter @trustai/api seed:demo` (ver
> [`docs/12-Deployment.md`](docs/12-Deployment.md)): queda con el email ya
> verificado, lista para iniciar sesión.

> La verificación pública (UC-02) no requiere login: al abrir el enlace
> de verificación pública de un DTR, la app recalcula el hash canónico y
> lo compara contra el registro on-chain.

---

## Qué hace

TrustAI emite un **Digital Trust Record (DTR)** para un activo digital:

1. **Subida** de un activo (por ejemplo, un PDF). Se almacena cifrado
   (AES-256-GCM).
2. La **revisión con IA** produce una evaluación estructurada del
   contenido.
3. El DTR se **canonicaliza y se hashea** de forma determinista
   (`@trustai/dtr-core`).
4. Ese hash canónico se **ancla en Base Sepolia** mediante el contrato
   `AnchorRegistry`.
5. Cualquiera puede **verificar la integridad de forma independiente**
   recalculando el hash y comparándolo con el anclaje on-chain — sin
   necesidad de confiar en TrustAI.

---

## Arquitectura y stack

Stack full-TypeScript con una API **hexagonal (puertos y adaptadores)**.
Las decisiones clave están registradas como ADR en
[`docs/adr/`](docs/adr/).

| Capa | Tecnología |
|---|---|
| Web | Next.js (App Router), Tailwind, TanStack Query — [ADR-005](docs/adr/ADR-005-frontend-app-router-tailwind-tanstack.md) |
| API | NestJS + worker `pg-boss` in-process (siempre activo) — [ADR-002](docs/adr/ADR-002-stack-full-typescript.md) |
| Core | `@trustai/dtr-core` — canonicalización, hashing y verificación sin framework — [ADR-001](docs/adr/ADR-001-anclaje-hash-dtr-canonico.md) |
| Contrato | `AnchorRegistry` en Solidity + Foundry — [ADR-003](docs/adr/ADR-003-contrato-minimo-anchor-registry.md) |
| IA | Adaptador dual (`stub` / `openai`) — [ADR-004](docs/adr/ADR-004-doble-adaptador-ia.md) |
| Persistencia | PostgreSQL (datos + cola pg-boss) vía Prisma |
| Almacenamiento | Cloudflare R2 (compatible con S3), activos cifrados en reposo |
| Blockchain | Base Sepolia (chain id `84532`) |
| Despliegue | Vercel (web) + Railway (API + Postgres) + R2 — [ADR-006](docs/adr/ADR-006-stack-de-despliegue-mvp.md) |

Topología de despliegue y mapa de variables de entorno por servicio:
[`docs/12-Deployment.md`](docs/12-Deployment.md).

---

## Estructura del monorepo

```
packages/dtr-core/   # Núcleo de canonicalización, hashing y verificación (sin framework)
apps/api/            # API NestJS + worker de anclaje pg-boss (hexagonal)
apps/web/            # App web Next.js (auth, wizard de certificación, historial, verificación pública)
smart-contracts/     # AnchorRegistry (Solidity + Foundry)
infrastructure/      # docker-compose para Postgres + MinIO local (compatible con S3)
docs/                # Documentación de producto e ingeniería (incluye el índice del TDD)
```

---

## Ejecutar en local

**Requisitos previos:** Node `>=22`, pnpm `11.9.0`, Docker.

### Atajo (Windows / PowerShell 7+)

Los scripts `dev-up.ps1` y `dev-down.ps1` automatizan todo el arranque de
forma idempotente (arrancan Docker Desktop si hace falta, levantan
Postgres + MinIO, crean el bucket S3, copian los `.env` faltantes desde
`.env.example`, generan `ASSET_ENCRYPTION_KEY` si está vacía, aplican el
esquema Prisma, siembran el usuario demo y arrancan API y web en
segundo plano):

```powershell
pnpm install
.\dev-up.ps1     # levanta todo; imprime URLs, credenciales y logs
.\dev-down.ps1   # detiene servidores y contenedores (conserva datos)
```

Logs en vivo: `Get-Content "$env:TEMP\trustai\api.log" -Wait`.
Para borrar también los datos: `.\dev-down.ps1 -Full -Volumes`.

### Paso a paso (cualquier SO)

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar la infraestructura local (Postgres + MinIO como almacenamiento compatible con S3)
docker compose -f infrastructure/docker-compose.yml up -d

# 3. Configurar el entorno
#    Copia los ejemplos y completa los valores (ver docs/12-Deployment.md
#    para la referencia completa de variables).
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Compilar el paquete core (web y api dependen de él)
pnpm --filter @trustai/dtr-core build

# 5. Aplicar el esquema de base de datos
pnpm --filter @trustai/api db:deploy

# 6. Ejecutar API y web (en terminales separadas)
pnpm --filter @trustai/api start:dev
pnpm --filter @trustai/web dev
```

> La API necesita `ASSET_ENCRYPTION_KEY` (base64 de 32 bytes) o falla al
> arrancar. Genera una con:
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
> El anclaje puede correr contra una cadena local (anvil) o contra Base
> Sepolia real — ver [`docs/12-Deployment.md`](docs/12-Deployment.md).

### Pruebas

```bash
pnpm -r test          # 327 pruebas unitarias (dtr-core 29 + api 170 + web 128)
pnpm -r typecheck
```

Los e2e (Playwright, requieren el stack local levantado) están en
`apps/web/e2e/`. Las pruebas de contrato con Foundry están en
`smart-contracts/test/`. También hay un e2e gateado por entorno que
corre contra **Base Sepolia real**
(`apps/api/test/anchor-basesepolia.e2e-spec.ts`).

El CI ejecuta build + typecheck + lint + toda la suite unitaria en cada
push (`.github/workflows/ci.yml`).

---

## Documentación

Empieza por [`docs/TDD-Index.md`](docs/TDD-Index.md) — el índice maestro
del Technical Design Document. Destacados:

- **Producto y negocio:** [Visión de Producto](docs/01-Product-Vision.md),
  [Investigación de Mercado](docs/02-Market-Research.md),
  [Modelo de Negocio](docs/03-Business-Model/03-Business-Model.md),
  [Viabilidad](docs/04-Viability.md)
- **Ingeniería:** [Requisitos](docs/06-Requirements.md),
  [Modelo de Dominio](docs/07-Domain-Model.md),
  [Arquitectura (C4)](docs/08-Architecture.md),
  [Diseño del Smart Contract](docs/09-Smart-Contract-Design.md),
  [Arquitectura de IA](docs/10-AI-Architecture.md)
- **Entrega:** [Definición del MVP](docs/11-MVP-Definition.md),
  [Despliegue](docs/12-Deployment.md),
  [Endpoints de la API](docs/api/endpoints.md), [ADRs](docs/adr/)
