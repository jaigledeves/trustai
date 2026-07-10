# ADR-006: Stack de despliegue del MVP (web + API/worker + Postgres + storage)

- **Estado:** Accepted
- **Fecha:** 2026-07-10 (Proposed → Accepted el 2026-07-10)
- **Decisores:** Jose (Product Owner), agente IA (arquitectura)
- **Relacionadas:** ADR-002 (stack full TypeScript), ADR-005 (frontend App Router), docs/04-Viability.md (costes), docs/11-MVP-Definition.md (criterio de aceptación: despliegue accesible por URL)

## Contexto

El MVP ya funciona de punta a punta en local contra Base Sepolia real (certificar → anclar → `CERTIFIED`, verificado on-chain). El criterio de aceptación pendiente de docs/11 es **"desplegado y accesible por URL"**, y es entregable explícito del TFM (BIG School). El presupuesto objetivo de docs/04 es **~€15-20/mes** (MVP académico; gas €0 en testnet).

Restricciones técnicas que condicionan el hosting:

- **La API no es sin estado.** `apps/api/src/app.module.ts` monta `WorkerModule`, que registra consumidores `boss.work` de **pg-boss en el mismo proceso** (`job-registration.service.ts`). El `ConfirmAnchorHandler` se **auto-reencola** vía `sendAfter` (poll cada 15 s, timeout 10 min, requiere 2 confirmaciones on-chain). El proceso debe estar **siempre vivo** para drenar la cola y llevar un DTR hasta `CERTIFIED`.
- **Postgres hace doble función**: datos de la app **y** backend de cola de pg-boss (polling + LISTEN/NOTIFY). No es un mero almacén pasivo.
- **El web (Next.js 16, App Router)** usa RSC + route handlers (proxy Bearer, cookie httpOnly de ADR-005): necesita runtime Node, no export estático.
- Faltan artefactos productivos: no hay `Dockerfile` ni config de plataforma; la API solo tiene `start:dev` (ts-node-dev), falta `build` + `start` (`node dist/main.js`); y no hay migraciones (schema aplicado con `prisma db push`).
- Equipo de **una sola persona**; la fiabilidad de la demo del tribunal pesa más que el ahorro marginal.

## Problema

¿Dónde y cómo desplegar `apps/web`, `apps/api` (con su worker in-process), Postgres y el almacenamiento de objetos S3-compatible, respetando el presupuesto y garantizando que el worker always-on y la cola pg-boss funcionen de forma fiable el día de la defensa?

## Alternativas consideradas

Consecuencia transversal de la restricción del worker: quedan **descartados para la API** los entornos serverless/scale-to-zero (Vercel Functions, AWS Lambda, Cloudflare Workers, Cloud Run scale-to-zero) y el free tier de Render (spin-down a los ~15 min de inactividad mataría el worker). El **web** sí admite serverless.

1. **A — PaaS split: Vercel (web) + Railway (API + Postgres) + Cloudflare R2 (storage)** *(elegido)*
   - **Pros:** web en Vercel con soporte nativo de Next 16 y preview deploys; Railway mantiene el proceso caliente (worker OK) e inyecta `DATABASE_URL` del Postgres gestionado contiguo; R2 es S3-compatible con 10 GB gratis y el `S3StorageAdapter` ya soporta `endpoint` custom + `forcePathStyle`; mínima operación (TLS, dominios y restarts los da la plataforma). Coste ~€5-15/mes.
   - **Contras:** tres proveedores = tres dashboards y tres sets de secretos; CORS entre dominios distintos; Railway es usage-based (hay que vigilar consumo); lock-in blando en la config de build.

2. **B — All-in-one PaaS: Render o Railway para web + API + Postgres + R2**
   - **Pros:** un solo proveedor y dashboard; web y API pueden compartir dominio (CORS trivial); menor superficie de configuración.
   - **Contras:** el build de Next en Render es menos pulido que en Vercel; para evitar spin-down hacen falta planes de pago en ambos servicios, subiendo el coste; menos "lo mejor de cada casa".

3. **C — VPS único con Docker Compose: Hetzner CX22 (~€4/mes) + Caddy (TLS) + R2 o MinIO local**
   - **Pros:** el más barato y con todo en un lugar; reutiliza casi tal cual `infrastructure/docker-compose.yml`; worker always-on por definición (proceso en la VM); excelente narrativa de "desplegué y operé infra real"; cero lock-in.
   - **Contras:** el desarrollador asume el rol de **sysadmin** (TLS, updates de SO, backups de Postgres, hardening, monitoreo); MinIO en la misma VM añade un punto de fallo; mayor tiempo de setup; si la VM se cae en la defensa, es responsabilidad propia.

## Decisión

Se adopta la **opción A: Vercel (web) + Railway (API + Postgres) + Cloudflare R2 (storage)**, con las mismas variables de entorno de Base Sepolia ya validadas.

Razón frente a las alternativas: el TFM se evalúa por el **producto** y por el **desarrollo asistido por IA**, no por la destreza de sysadmin, por lo que la fiabilidad de la demo y el bajo coste operativo priman sobre el ahorro de ~€3/mes o el valor didáctico de operar un VPS. La opción A resuelve el único punto técnicamente delicado —worker always-on + Postgres para pg-boss— sin infraestructura que administrar (descarta el spin-down que rompería el anclaje), y mantiene el web en la plataforma con mejor soporte de Next. La opción C sería preferible si el objetivo de aprendizaje fuera DevOps; no es el caso de este entregable.

## Consecuencias

**Positivas**
- Worker in-process y cola pg-boss corren en un proceso caliente y persistente (Railway): el ciclo `ANCHORING → CERTIFIED` se completa de forma fiable.
- Postgres gestionado con `DATABASE_URL` inyectada y backups de plataforma; sirve a la app y a pg-boss sin operación manual.
- Storage S3-compatible (R2) sin coste en el volumen del MVP; compatible con el adaptador existente sin cambios de código.
- Web con CI/preview de Vercel; despliegues por push.
- Coste dentro del objetivo de docs/04.

**Negativas / coste asumido**
- Tres proveedores y tres consolas de secretos; hay que documentar el mapa de env por servicio.
- CORS y URLs cruzadas entre el dominio del web (Vercel) y el de la API (Railway) requieren configuración explícita (`enableCors`, `API_BASE_URL`, `NEXT_PUBLIC_*`).
- Trabajo previo necesario en el repo antes de desplegar: añadir `build`/`start` productivos a la API (`node dist/main.js`), definir cómo se aplica el schema en prod (migración Prisma o `db push` en el pipeline), y crear la config de cada plataforma.
- Railway usage-based: hay que monitorear el gasto para no exceder el presupuesto.
- Lock-in blando en la configuración de build de cada PaaS.

**Seguimiento**
- Reconsiderar si aparece un cliente real o el volumen crece: producción v1 (docs/04) puede exigir separar el worker en su propio servicio, mover Postgres a un plan mayor y activar batching Merkle.
- Si el CORS multi-dominio genera fricción, evaluar unificar bajo un mismo dominio (opción B) o un proxy.
- Antes de mainnet: revisar gestión de secretos (la private key del worker pasa de `.env` a variables de la plataforma; considerar un secrets manager).
- Si el objetivo del proyecto vira a demostrar DevOps, migrar a la opción C (VPS) queda documentada como camino alternativo.
