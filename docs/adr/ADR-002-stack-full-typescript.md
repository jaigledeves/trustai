# ADR-002: Stack full TypeScript (Next.js + NestJS + Prisma)

**Estado:** Aceptada
**Fecha:** 05/07/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)

## Contexto

La propuesta original del proyecto planteaba
FastAPI (Python) + Next.js (TypeScript). El producto tiene dos pilares
técnicos con ecosistemas en tensión:

- **IA**: Python tiene el ecosistema más rico, pero los SDKs oficiales
  de OpenAI, Anthropic y Mistral en TypeScript cubren todo lo que el
  producto necesita (chat completions, structured outputs, visión).
- **Blockchain EVM**: el ecosistema es TypeScript-first (viem,
  Hardhat/Foundry tooling, wagmi). web3.py es correcto pero secundario.

Equipo: una sola persona. El coste de context-switching entre dos
lenguajes y dos ecosistemas de testing/tooling es real.

## Decisión

Stack completo en TypeScript:

- **Frontend**: Next.js (app detrás de login + página pública de
  verificación con SSR/metadata).
- **Backend**: NestJS con arquitectura hexagonal; API + worker en el
  mismo repo, procesos separados.
- **ORM/BD**: Prisma + PostgreSQL.
- **Blockchain**: viem para interacción; Foundry para el contrato.
- **Monorepo**: pnpm workspaces con paquete compartido `dtr-core`
  (canonicalización/hashing/verificación) usable desde navegador, API y
  como librería open source (RNF-032).

## Alternativas consideradas

### A. FastAPI + Next.js (propuesta original)

- Pros: mejor ecosistema IA nativo; FastAPI genera OpenAPI.
- Contras: dos lenguajes para una persona; ecosistema EVM más débil;
  imposible compartir la lógica de verificación entre backend y
  navegador (habría que duplicarla, con riesgo de divergencia en la
  pieza más crítica del producto).
- **Descartada.**

### B. Next.js full-stack (sin NestJS)

- Pros: máxima simplicidad, un solo deploy.
- Contras: worker asíncrono con reintentos encaja mal en el modelo
  serverless/API-routes; la estructura hexagonal y OpenAPI (API First,
  Constitución) son ciudadanos de primera en NestJS.
- **Descartada** (revisable si la API resultara trivial).

### C. Full TypeScript con NestJS (elegida)

- Pros: un lenguaje; mejor ecosistema EVM; `dtr-core` compartido
  navegador/servidor/librería pública; NestJS estructura la hexagonal;
  OpenAPI vía @nestjs/swagger.
- Contras: ecosistema IA algo menor que Python (aceptable: solo
  consumimos APIs); NestJS añade curva de aprendizaje si no se conoce.

## Consecuencias

1. La lógica de canonicalización y verificación se escribe UNA vez
   (`dtr-core`) y se ejecuta en navegador, servidor y CLI pública.
2. El contrato y su tooling (Foundry + viem) comparten tipos con la
   aplicación.
3. Si en el futuro se necesita ML propio (no APIs), se añadiría un
   servicio Python aislado tras un puerto — la hexagonal lo permite sin
   romper nada.

## Referencias

- docs/08-Architecture.md
- docs/06-Requirements.md (RNF-030/031/032)
