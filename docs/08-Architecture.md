# 08 - Architecture

**Proyecto:** TrustAI
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Definir la arquitectura del sistema: vista C4 (contexto y
contenedores), stack tecnológico con sus ADRs, y las abstracciones que
garantizan los RNF de mantenibilidad (proveedor IA y blockchain
intercambiables).

## La arquitectura en una vista

**Stack decidido** (justificación en ADRs):

| Capa | Tecnología | ADR |
|---|---|---|
| Frontend | Next.js (React + TypeScript) | ADR-002 |
| Backend API | NestJS (TypeScript, arquitectura hexagonal) | ADR-002 |
| ORM / BD | Prisma + PostgreSQL | ADR-002 |
| Jobs asíncronos | pg-boss (cola sobre PostgreSQL) | §Decisiones |
| Blockchain | Contrato mínimo Solidity en L2 testnet (Base Sepolia) + viem | ADR-003 |
| IA | Puerto con adaptadores OpenAI y Mistral | ADR-004 |
| Storage | Object storage S3-compatible, cifrado AES-256 | §Decisiones |
| Monorepo | pnpm workspaces (apps/ + packages/) | ADR-002 |
| Infra (MVP desplegado) | Vercel (web) + Railway (API/worker + Postgres) + Cloudflare R2 (storage) | ADR-006 |

## C4 — Nivel 1: Contexto

> Fuente versionada: [`docs/diagrams/c4/context.mmd`](diagrams/c4/context.mmd)
> (verificada contra el código en esta pasada; el proveedor IA real en el
> MVP es solo OpenAI — ver nota bajo el diagrama).

```mermaid
C4Context
    title TrustAI — C4 Nivel 1: Contexto (verificado contra el código, 2026-07)

    Person(orguser, "Usuario de despacho", "P1-P3: certifica y gestiona activos")
    Person(verifier, "Verificador externo", "P4: verifica sin cuenta")

    System(trustai, "TrustAI", "Certificación inteligente de activos digitales (DTR)")

    System_Ext(llm, "Proveedor LLM", "OpenAI (adaptador real) / stub de desarrollo: análisis documental")
    System_Ext(chain, "Blockchain L2", "Base Sepolia: anclaje de evidencias (contrato AnchorRegistry desplegado)")
    System_Ext(email, "Email transaccional", "verificación de cuenta (adaptador stub en MVP)")
    System_Ext(storage, "Object Storage", "activos cifrados (S3-compatible: Cloudflare R2 en prod, in-memory en tests)")

    Rel(orguser, trustai, "Certifica, consulta, comparte")
    Rel(verifier, trustai, "Verifica DTRs (público, sin auth)")
    Rel(trustai, llm, "Análisis: resumen + clasificación")
    Rel(trustai, chain, "Ancla hashes / lee confirmaciones (viem)")
    Rel(trustai, email, "Envía emails")
    Rel(trustai, storage, "Guarda/recupera blobs cifrados (AES-256-GCM)")
    Rel(verifier, chain, "Verificación independiente (enlace a tx)", "opcional")
```

La flecha `verifier → chain` es deliberada y es el alma del producto:
el verificador PUEDE comprobar la evidencia sin pasar por TrustAI
(RNF-032).

**Nota de drift corregida (2026-07):** el segundo adaptador IA real
(Mistral) previsto en ADR-004 no está implementado en el código — el MVP
usa `AI_ADAPTER=stub` (default) u `openai`, tal como registra la
enmienda de ADR-004 en 11-MVP-Definition.md. El diagrama ya refleja esto.

## C4 — Nivel 2: Contenedores

> Fuente versionada: [`docs/diagrams/c4/container.mmd`](diagrams/c4/container.mmd)

```mermaid
C4Container
    title TrustAI — C4 Nivel 2: Contenedores (verificado contra el código, 2026-07)

    Person(orguser, "Usuario de despacho")
    Person(verifier, "Verificador externo")

    System_Boundary(trustai, "TrustAI") {
        Container(web, "Web App", "Next.js 16 (App Router)", "UI de certificación (app/(dashboard)) + login/registro (app/(auth)) + página pública /verify/[id]")
        Container(api, "API", "NestJS (Node)", "Módulos: auth, assets, trust-records, public-verification, health. Núcleo hexagonal (domain/application/ports/adapters)")
        Container(worker, "Worker", "NestJS + pg-boss (mismo proceso que la API)", "Jobs: analyze-document, anchor-dtr, confirm-anchor (WorkerModule, in-process)")
        ContainerDb(db, "PostgreSQL", "Prisma", "Users, Organizations, DigitalAssets, TrustRecords, Anchors, VerificationAttempts + cola pg-boss")
        Container(dtrcore, "@trustai/dtr-core", "Paquete TS compartido (packages/dtr-core)", "Canonicalización RFC 8785 + SHA-256, verificación")
        Container(contract, "AnchorRegistry", "Solidity 0.8.24 (Foundry)", "anchor(bytes32) + isAnchored(bytes32) + evento Anchored. Desplegado en Base Sepolia: 0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22")
    }

    System_Ext(llm, "OpenAI (adaptador real) / stub")
    System_Ext(chain, "Base Sepolia (L2, chainId 84532)")
    System_Ext(storage, "Object Storage S3-compatible (R2 / in-memory)")

    Rel(orguser, web, "HTTPS")
    Rel(verifier, web, "HTTPS (sin auth)")
    Rel(web, api, "REST/JSON (Bearer + cookie httpOnly)")
    Rel(api, db, "Prisma Client")
    Rel(api, worker, "encola jobs (mismo proceso)", "pg-boss")
    Rel(worker, llm, "análisis (AiAnalysisPort)")
    Rel(worker, chain, "viem: submitAnchor / isAnchored")
    Rel(worker, db, "actualiza estados de TrustRecord/Anchor")
    Rel(api, storage, "blobs cifrados (StoragePort)")
    Rel(contract, chain, "desplegado en")
    Rel(api, dtrcore, "usa: sha256Hex, verifyAssetAgainstRecord")
    Rel(web, dtrcore, "usa (hash en cliente, ClientHashRecompute)")
```

Endpoints reales de la API (auth, assets, trust-records,
public-verification) documentados con diagramas de secuencia en
[`docs/api/endpoints.md`](api/endpoints.md).

## Estructura del monorepo

```
trustai/
├── apps/
│   ├── web/            # Next.js
│   ├── api/            # NestJS (API + worker)
│   └── ...
├── packages/
│   ├── dtr-core/       # canonicalización, hashing, verificación (RNF-032)
│   └── shared/         # tipos y contratos compartidos
├── smart-contracts/    # Solidity + Foundry
├── infrastructure/     # Docker, compose, CI
└── docs/
```

**`dtr-core` es la pieza estratégica**: el algoritmo de
canonicalización (ADR-001) y la verificación viven en un paquete puro,
sin dependencias de framework, con la cobertura de tests exigida por
RNF-033. Al ser TypeScript compartido: el navegador puede hashear en
cliente, la API certifica, y el paquete puede publicarse open source
para que cualquiera verifique fuera de la plataforma (RNF-032) — la
misma lógica en los tres sitios, imposible que diverjan.

## Arquitectura interna de la API (hexagonal)

| Capa | Contenido | Regla |
|---|---|---|
| Dominio | Agregados e invariantes del 07 (TrustRecord, Anchor…) | Cero dependencias de framework |
| Aplicación | Casos de uso (UC-01…07) | Orquesta dominio + puertos |
| Puertos | `AiAnalysisPort`, `AnchorPort`, `StoragePort`, `NotificationPort` | Interfaces del dominio hacia fuera |
| Adaptadores | OpenAI/Mistral (ADR-004), viem/Base (ADR-003), S3, SMTP | Intercambiables (RNF-030/031) |

El puerto `AnchorPort` expone `anchor(hashes: Hash[]): AnchorReceipt` —
la firma acepta lote desde el día uno: anclaje individual = lote de 1
(RF-035, INV-30).

## Decisiones

1. **Full TypeScript** (ADR-002): un lenguaje en todo el stack; el
   ecosistema EVM es TS-first (viem, Foundry con TS tooling); equipo de
   una persona.
2. **Contrato mínimo `AnchorRegistry`** (ADR-003): una función que
   registra `bytes32` y emite evento. El mismo `bytes32` sirve para
   hash individual o Merkle root — sin cambios de contrato al activar
   batching.
3. **Dos adaptadores IA reales desde el día uno** (ADR-004): OpenAI +
   Mistral (UE, RGPD). La abstracción se demuestra funcionando, no en
   un diagrama.
4. **pg-boss en lugar de Redis+BullMQ**: la cola vive en PostgreSQL.
   Menos infraestructura, transaccionalidad con los datos (un job de
   anclaje se encola en la misma tx que crea el DTR), coherente con los
   costes del 04. Revisable si el volumen lo exige (umbral: >10K
   jobs/día).
5. **API y worker en el mismo código NestJS**, desplegables como
   procesos separados: monolito modular ahora, separables después.
   Microservicios: NO para un equipo de una persona.
6. **Object storage S3-compatible en la UE** con cifrado AES-256 en
   aplicación (RNF-002, RNF-010).
7. **Auth propia con JWT + Argon2** (RNF-003): email+contraseña y
   verificación de email. Sin SSO (RF-007 Won't).

## Alternativas consideradas

- **FastAPI (propuesta original)**: descartada tras análisis — dividía
  el stack en dos lenguajes y el ecosistema EVM en Python es más débil.
  Registrado formalmente en ADR-002.
- **Next.js full-stack (API routes, sin NestJS)**: viable y más simple,
  pero la arquitectura hexagonal y el worker asíncrono encajan mejor en
  NestJS; el API First (OpenAPI) es requisito de la Constitución.
- **Redis + BullMQ**: estándar de la industria, pero añade una pieza de
  infraestructura que el MVP no necesita (ver decisión 4).
- **Serverless (Lambda/Vercel functions para el worker)**: descartado;
  el anclaje requiere jobs con reintentos y estado — más simple con un
  worker persistente.

## Riesgos

- Next.js y NestJS evolucionan rápido: fijar versiones y actualizar
  conscientemente, no por inercia.
- pg-boss es menos conocido que BullMQ: documentar el porqué (hecho
  aquí) para futuros colaboradores.
- El contrato, una vez desplegado en mainnet (post-MVP), es inmutable:
  el diseño mínimo reduce la superficie, pero exige revisión/auditoría
  ligera antes de ese salto.

## Referencias

- docs/adr/ADR-002-stack-full-typescript.md
- docs/adr/ADR-003-contrato-minimo-anchor-registry.md
- docs/adr/ADR-004-doble-adaptador-ia.md
- docs/adr/ADR-006-stack-de-despliegue-mvp.md
- docs/07-Domain-Model.md (agregados e invariantes)
- docs/06-Requirements.md (RNF-022/030/031/032/033)
- docs/04-Viability.md (costes, batching, proveedores UE)
- docs/api/endpoints.md (endpoints reales + secuencias certify/verify)

## Checklist

- [x] C4 contexto y contenedores (fuentes en docs/diagrams/c4/, verificadas contra el código)
- [x] Stack completo decidido con ADRs
- [x] Abstracciones de IA y blockchain definidas como puertos
- [x] Estructura de monorepo alineada con la Constitución (§Repository Vision)
- [x] Estrategia async para anclaje (RNF-022)
- [x] Implementado: `dtr-core`, contrato desplegado en Base Sepolia, API/worker/web funcionales (ver 11-MVP-Definition.md)
- [ ] C4 nivel 3 (componentes del núcleo Certification) — pendiente, no bloqueante para el MVP
- [x] Diseño de API derivado de este documento — ver docs/api/endpoints.md (BD sigue en `schema.prisma`, sin doc 13 dedicado — ver TDD-Index)

## Próximo Documento

09-Smart-Contract-Design.md y 10-AI-Architecture.md
