# Informe de deriva documentación vs código

**Fecha:** 2026-08-05
**Alcance:** carpeta `docs/` contrastada con `apps/api`, `apps/web` y `docs/adr/`.
**Método:** solo lectura sobre controladores/rutas reales, DTOs, páginas web y
casos de uso. Detonante: serie de cambios SDD recientes (recuperación de
contraseña, filtros de la lista de DTRs, UX de certificación/verificación).

Severidades: `alta` (contradice al código), `media` (falta cobertura),
`baja` (frescura/estilo).

## Estado

Todas las derivas de esta pasada quedaron **corregidas** en el mismo commit
(ver columna «Acción»). Este informe se conserva como traza de la verificación.

## Hallazgos

| # | Severidad | Tipo | Ubicación | Descripción | Acción |
|---|-----------|------|-----------|-------------|--------|
| 1 | alta | Endpoint sin documentar | `docs/api/endpoints.md` §`auth` | El código expone `POST /auth/forgot-password` y `POST /auth/reset-password` (`apps/api/src/modules/auth/auth.controller.ts:64,76`) y no estaban en la tabla. `forgot-password` responde siempre `200 { ok: true }` (defensa anti-enumeración); `reset-password` devuelve `400` con token inválido/caducado. | Corregida: 2 filas nuevas en la tabla `auth`. |
| 2 | media | Firma de endpoint desactualizada | `docs/api/endpoints.md` §`trust-records` | `GET /trust-records` documentaba solo `page`/`pageSize`. El real acepta además `search` (filename contains, case-insensitive) y `state` (estado exacto), validados por `ListTrustRecordsQueryDto`; `state` inválido → `400` (ADR-008); `pageSize` default 20, clamp 100. | Corregida: fila actualizada con filtros, 400 y defaults. |
| 3 | media | Estado de implementación incompleto | `docs/11-MVP-Definition.md` §Estado (fila Auth) | Listaba auth como `register/verify-email/login/me` y web `app/(auth)/{login,register,verify-email}`, omitiendo la recuperación de contraseña, que **ya está implementada** (API + páginas `forgot-password`/`reset-password`). RF-003 (Must) pasó de pendiente a hecho sin reflejarse. | Corregida: fila Auth ampliada con forgot/reset. |
| 4 | media | Índice incompleto | `docs/README.md` §ADR | La tabla listaba solo ADR-001..006. Existen y están activas ADR-007, ADR-008 y ADR-009 (007/008 referenciadas en el código). | Corregida: 3 filas nuevas en la tabla ADR. |
| 5 | media | Diagrama sin cobertura | `docs/13-Security.md` + `docs/diagrams/sequence/auth-flow.mmd` | El flujo de auth cubría registro/verify-email/login/ruta protegida pero no la recuperación de contraseña (feature Must ya implementada). | Corregida: nueva Fase 4 (forgot/reset) en el doc y en el `.mmd`. |

## No es deriva (verificado, correcto)

- `docs/06-Requirements.md:37` — RF-003 (Recuperación de contraseña, Must, UC-07)
  ya figuraba; no había deriva en requisitos.
- Diagramas C4 (`context.mmd`, `container.mmd`) y de secuencia
  certify/verify: los cambios recientes fueron aditivos y no removieron
  piezas; las cajas y flujos siguen siendo fieles.
- Convención de auth y verdictos públicos (`endpoints.md` §convenciones) sin
  cambios de contrato.

## Referencias de código consultadas

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/application/auth/{forgot-password,reset-password}.use-case.ts`
- `apps/api/src/modules/trust-records/trust-records.controller.ts`
- `apps/api/src/modules/trust-records/dto/list-trust-records-query.dto.ts`
- `apps/web/app/(auth)/{forgot-password,reset-password}/page.tsx`
- `apps/web/components/auth/{ForgotPasswordForm,ResetPasswordForm}.tsx`
- `docs/adr/` (existen ADR-001..009)
