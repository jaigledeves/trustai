# TrustAI — TDD Index (documento vivo)

**Propósito:** índice maestro del Technical Design Document. El TDD no
es un monolito: emerge de documentos modulares. Este índice mapea las
23 secciones previstas del TDD maestro a su documento fuente y estado.

**Estados:** `pendiente` · `draft` · `aprobado`

| # | Sección TDD | Documento fuente | Estado |
|---|---|---|---|
| 1 | Executive Summary | Derivable de 01 + 11 al cierre | pendiente |
| 2 | Product Vision | [01-Product-Vision.md](01-Product-Vision.md) | draft |
| 3 | Business Analysis | [03-Business-Model.md](03-Business-Model.md) | draft |
| 4 | Market Research | [02-Market-Research.md](02-Market-Research.md) | draft |
| 5 | Functional Requirements | [06-Requirements.md](06-Requirements.md) | draft |
| 6 | Non Functional Requirements | [06-Requirements.md](06-Requirements.md) | draft |
| 7 | Domain Model | [07-Domain-Model.md](07-Domain-Model.md) | draft |
| 8 | C4 Architecture | [08-Architecture.md](08-Architecture.md) | draft |
| 9 | Database Design | 12-Database-Design.md (Fase 2) | pendiente |
| 10 | Smart Contracts | [09-Smart-Contract-Design.md](09-Smart-Contract-Design.md) | draft |
| 11 | AI Architecture | [10-AI-Architecture.md](10-AI-Architecture.md) | draft |
| 12 | REST API | [api/endpoints.md](api/endpoints.md) (endpoints reales + secuencias certify/verify) | draft |
| 13 | Security | [13-Security.md](13-Security.md) (autenticación y modelo de sesión: JWT en cookie httpOnly, BFF Next.js, doble candado) + transversal 06 (RNF) + 08 + 09 | draft |
| 14 | DevOps | [12-Deployment.md](12-Deployment.md) + [ADR-006](adr/ADR-006-stack-de-despliegue-mvp.md) | draft |
| 15 | Testing | Suite real en `apps/api` (unit + e2e, incl. `anchor-basesepolia.e2e-spec.ts` contra Base Sepolia real) y `smart-contracts/test` (Foundry); sin documento narrativo dedicado | draft parcial |
| 16 | Deployment | [12-Deployment.md](12-Deployment.md) | draft |
| 17 | Business Model Canvas | [03-Business-Model.md](03-Business-Model.md) (Lean Canvas fusionado) | draft |
| 18 | Financial Feasibility | [04-Viability.md](04-Viability.md) | draft |
| 19 | Monetization | [03-Business-Model.md](03-Business-Model.md) §Pricing | draft |
| 20 | Roadmap | 11 §Fuera (condiciones de retorno) + por consolidar | pendiente |
| 21 | Scrum Plan | Fase 2 (plan de iteraciones) | pendiente |
| 22 | TFM Memory | Fase final; incluirá el proceso de desarrollo con IA como caso de estudio | pendiente |
| 23 | Future Work | 01 §11 + recortes del 11 | draft parcial |

## Documentos adicionales no previstos en el índice original

| Documento | Rol |
|---|---|
| [00-Project-Constitution.md](00-Project-Constitution.md) | Reglas de ingeniería y gobernanza |
| [05-Personas-UseCases.md](05-Personas-UseCases.md) | Puente entre visión y requisitos |
| [11-MVP-Definition.md](11-MVP-Definition.md) | Gate de salida de la Fase 1 (con estado de implementación real) |
| [adr/](adr/) | ADR-001 anclaje DTR · ADR-002 stack TS · ADR-003 contrato · ADR-004 IA · ADR-005 frontend · ADR-006 despliegue |
| [api/endpoints.md](api/endpoints.md) | Endpoints REST reales + diagramas de secuencia certify/verify |
| [diagrams/](diagrams/) | Fuentes `.mmd` de los diagramas C4 y de secuencia (certify-flow, verify-flow, auth-flow) embebidos en 08, api/endpoints.md y §13 Security |

## Regla de mantenimiento

Cada documento nuevo o cambio de estado actualiza esta tabla. El
"TDD completo" es la suma de las filas en estado `aprobado` — nunca un
archivo gigante aparte.
