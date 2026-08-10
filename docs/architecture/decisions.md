# Índice de decisiones de arquitectura (ADR)

Registro de las Architecture Decision Records del proyecto. Las ADR son
**inmutables**: no se editan una vez aceptadas; una decisión que cambia se
**supersede** con una ADR nueva que referencia a la anterior.

Las ADR viven en [`docs/adr/`](../adr/). El formato de cada archivo es
`ADR-NNN-titulo-en-kebab-case.md`.

## Estados

- **Aceptada / Accepted**: decisión vigente.
- **Enmendada**: aceptada pero con matices añadidos posteriormente (ver el
  cuerpo de la ADR).
- **Supersedida**: reemplazada por una ADR posterior (se indica cuál).

## Registro

| ADR | Título | Estado | Fecha |
|-----|--------|--------|-------|
| [ADR-001](../adr/ADR-001-anclaje-hash-dtr-canonico.md) | Anclar en blockchain el hash del DTR canónico completo | Aceptada | 2026-07-05 |
| [ADR-002](../adr/ADR-002-stack-full-typescript.md) | Stack full TypeScript (Next.js + NestJS + Prisma) | Aceptada | 2026-07-05 |
| [ADR-003](../adr/ADR-003-contrato-minimo-anchor-registry.md) | Contrato mínimo AnchorRegistry en L2 (Base Sepolia) | Aceptada | 2026-07-05 |
| [ADR-004](../adr/ADR-004-doble-adaptador-ia.md) | Doble adaptador IA desde el día uno (OpenAI + Mistral) | Aceptada (enmendada) | 2026-07-05 |
| [ADR-005](../adr/ADR-005-frontend-app-router-tailwind-tanstack.md) | Arquitectura de detalle del frontend (App Router + Tailwind/shadcn + TanStack Query) | Aceptada | 2026-07-08 |
| [ADR-006](../adr/ADR-006-stack-de-despliegue-mvp.md) | Stack de despliegue del MVP (web + API/worker + Postgres + storage) | Aceptada | 2026-07-10 |
| [ADR-007](../adr/ADR-007-metodo-repo-dedicado-para-join-de-asset-org-scoped.md) | Método de repositorio dedicado para el join de asset org-scoped | Aceptada | 2026-08-04 |
| [ADR-008](../adr/ADR-008-dto-de-query-validado-para-filtros-de-lista.md) | DTO de query validado para los filtros de la lista de DTR | Aceptada | 2026-08-04 |
| [ADR-009](../adr/ADR-009-web-dueno-del-copy-de-veredictos-y-aviso-eidas.md) | Web es dueña del copy de veredictos y del aviso eIDAS (Opción W) | Aceptada | 2026-08-05 |
| [ADR-010](../adr/ADR-010-verbo-canonico-anclar-vs-registrar.md) | Verbo canónico para la acción on-chain — "anclar" sobre "registrar" (incluye el stepper de certify) | Aceptada | 2026-08-10 |
| [ADR-011](../adr/ADR-011-cookie-server-component-theming-sobre-next-themes.md) | Theming con cookie + Server Component en vez de `next-themes` (SSR sin FOUC) | Aceptada | 2026-08-10 |

## Cómo añadir una ADR

1. Copiá el formato de una ADR existente (contexto, problema, alternativas,
   decisión, consecuencias, referencias).
2. Numerá secuencialmente (`ADR-009-...`).
3. Añadí la fila correspondiente a la tabla de arriba.
4. Si supersede a otra, indicá la relación en ambas: la nueva referencia a la
   vieja, y la vieja pasa a estado **Supersedida** (única excepción a la
   inmutabilidad: sólo se marca el estado, no se reescribe el contenido).
