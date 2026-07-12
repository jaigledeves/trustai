# TrustAI — Documentación

Índice navegable de la documentación del proyecto (TFM: certificación de
contenido con IA + anclaje blockchain en Base Sepolia). Documento vivo:
actualízalo en cada pasada de documentación en vez de duplicar contenido.

## Cómo está organizada

La documentación numerada (`00`–`12`) es el TDD modular del proyecto — ver
[TDD-Index.md](TDD-Index.md) para el mapeo completo a las 23 secciones
previstas del TDD maestro.

## Capítulos

| # | Documento | Contenido |
|---|---|---|
| 00 | [Project Constitution](00-Project-Constitution.md) | Reglas de ingeniería y gobernanza |
| 01 | [Product Vision](01-Product-Vision.md) | Visión de producto |
| 02 | [Market Research](02-Market-Research.md) | Análisis de mercado |
| 03 | [Business Model](03-Business-Model.md) | Modelo de negocio (ver también [03-Business-Model/](03-Business-Model/) con el desglose Lean/BMC/pricing/GTM) |
| 04 | [Viability](04-Viability.md) | Viabilidad económica |
| 05 | [Personas & Use Cases](05-Personas-UseCases.md) | Personas y casos de uso |
| 06 | [Requirements](06-Requirements.md) | Requisitos funcionales y no funcionales |
| 07 | [Domain Model](07-Domain-Model.md) | Modelo de dominio e invariantes |
| 08 | [Architecture](08-Architecture.md) | C4 (contexto/contenedores), stack, decisiones |
| 09 | [Smart Contract Design](09-Smart-Contract-Design.md) | Contrato `AnchorRegistry`, despliegue en Base Sepolia |
| 10 | [AI Architecture](10-AI-Architecture.md) | Arquitectura de la capa IA |
| 11 | [MVP Definition](11-MVP-Definition.md) | Alcance del MVP + estado real de implementación |
| 12 | [Deployment](12-Deployment.md) | Runbook de despliegue (Vercel + Railway + R2) |

## API y diagramas

- [api/endpoints.md](api/endpoints.md) — endpoints REST reales de `apps/api`, con diagramas de secuencia de certificación y verificación.
- [diagrams/c4/](diagrams/c4/) — fuentes `.mmd` de los diagramas C4 (contexto y contenedores), embebidos en [08-Architecture.md](08-Architecture.md).
- [diagrams/sequence/](diagrams/sequence/) — fuentes `.mmd` de los diagramas de secuencia de certificación y verificación, embebidos en [api/endpoints.md](api/endpoints.md).

## Architecture Decision Records

Las ADR son inmutables una vez aceptadas — nunca se editan, se supersede
con una ADR nueva.

| ADR | Título |
|---|---|
| [ADR-001](adr/ADR-001-anclaje-hash-dtr-canonico.md) | Anclaje del hash del DTR canónico |
| [ADR-002](adr/ADR-002-stack-full-typescript.md) | Stack full TypeScript |
| [ADR-003](adr/ADR-003-contrato-minimo-anchor-registry.md) | Contrato mínimo `AnchorRegistry` |
| [ADR-004](adr/ADR-004-doble-adaptador-ia.md) | Doble adaptador IA (enmendado a 1 real + stub en el MVP) |
| [ADR-005](adr/ADR-005-frontend-app-router-tailwind-tanstack.md) | Frontend: Next.js App Router + Tailwind + TanStack |
| [ADR-006](adr/ADR-006-stack-de-despliegue-mvp.md) | Stack de despliegue del MVP (Vercel + Railway + R2) |

## Índice maestro / estado

[TDD-Index.md](TDD-Index.md) — mapea cada sección del TDD original a su
documento fuente y estado (`pendiente` / `draft` / `aprobado`).
