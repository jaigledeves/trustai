# ADR-007: Método de repositorio dedicado para el join de asset org-scoped

**Estado:** Aceptada
**Fecha:** 04/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** ADR-005 (frontend App Router/TanStack); cambio SDD `improve-certify-wizard-navigation`

## Contexto

- El wizard de certificación (`/dtrs/[id]`) debe mostrar contexto del
  documento (nombre, tamaño, fecha de subida) en todas sus fases. Esos
  datos viven en `DigitalAsset`, no en `TrustRecord`.
- `GET /trust-records/:id` (`TrustRecordsController.getById`) hoy resuelve
  el detalle vía `TrustRecordRepositoryPort.findByIdForOrganization`, que
  devuelve una entidad `TrustRecord` **sin** los campos del asset.
- Ese mismo método `findByIdForOrganization` lo consumen tres use-cases
  del dominio: `ConfirmReviewUseCase`, `DiscardDraftUseCase` y
  `SubmitForAnchoringUseCase`. Todos esperan un `TrustRecord` plano.
- RNF-004 exige org-scoping **a nivel de query** (filtrar por
  `asset.organizationId` en la consulta, nunca post-filtrar un resultado
  sin scope). Un id de otra organización debe comportarse igual que uno
  inexistente (404, sin filtrar información de existencia entre orgs).
- Existe ya `findByIdWithAssetAndAnchor`, pero es **deliberadamente sin
  scope** (lo usa verificación pública, que no tiene `organizationId`).

## Problema

¿Cómo exponer los campos del asset en el camino org-scoped del detalle
sin romper el contrato del que dependen otros tres use-cases ni violar
RNF-004?

## Alternativas consideradas

### A. Ensanchar `findByIdForOrganization` con `include: { asset }`

- Pros: un solo método; no se añade superficie al puerto.
- Contras: cambia el tipo de retorno para **todos** los consumidores.
  Los tres use-cases del dominio pasarían a recibir un tipo más gordo
  del que no usan nada — acoplamiento innecesario y violación del
  Interface Segregation Principle. El blast-radius toca código de
  certificación que este cambio no debería tocar.
- **Descartada.**

### B. Reusar `findByIdWithAssetAndAnchor` + comprobar org en el controller

- Pros: reutiliza una query que ya hace el join del asset.
- Contras: ese método es sin scope; comprobar la organización en el
  controller es **post-filtrado** — exactamente lo que RNF-004 prohíbe.
  Además arrastra el anchor, que aquí se resuelve por separado.
- **Descartada** por incumplir RNF-004.

### C. Método dedicado nuevo org-scoped (elegida)

- Pros: blast-radius cero sobre los consumidores existentes; org-scoping
  a nivel de query idéntico al patrón vigente; una sola ida a la BD.
- Contras: una firma más en el puerto y su adaptador. Aceptable: el coste
  es una única query bien acotada.

## Decisión

Se añade al `TrustRecordRepositoryPort` un método nuevo:

```typescript
findByIdForOrganizationWithAsset(
  organizationId: string,
  id: string,
): Promise<{ trustRecord: TrustRecord; asset: DigitalAsset } | null>;
```

El adaptador Prisma lo implementa con el mismo patrón de join org-scoped
que ya usa `findByIdForOrganization`:

```typescript
findFirst({ where: { id, asset: { organizationId } }, include: { asset: true } })
```

`getById` cambia su llamada a este método nuevo; el resto del flujo del
controller (el lookup separado del anchor y el de `analysisFailureReason`
en pg-boss) queda intacto. `findByIdForOrganization` no se toca, así que
los tres use-cases del dominio siguen recibiendo el `TrustRecord` plano
que esperan.

## Consecuencias

**Positivas**

- Los use-cases de certificación no se ven afectados: cero riesgo de
  regresión en confirm/discard/anchor.
- Se respeta RNF-004: el filtrado por organización ocurre en la query, y
  un id cross-org devuelve `null` → 404 en el controller.
- El puerto expone intenciones distintas de forma explícita (detalle con
  asset vs. lookup plano), en línea con ISP.

**Negativas / coste asumido**

- El puerto gana una firma y el adaptador una query casi gemela de otra
  existente. Ligera duplicación estructural, justificada por el
  aislamiento de contratos.

**Seguimiento**

- Si en el futuro más caminos org-scoped necesitan el asset (p. ej. la
  lista ya trae `filename` por su cuenta), reconsiderar si conviene un
  único método de detalle enriquecido y deprecar el plano. Mientras solo
  el detalle lo necesite, el método dedicado es la opción de menor riesgo.

## Referencias

- `openspec/changes/improve-certify-wizard-navigation/design.md` (Decisión 1)
- `openspec/changes/improve-certify-wizard-navigation/specs/web-certify-flow/spec.md`
- `apps/api/src/ports/trust-record-repository.port.ts`
- `apps/api/src/adapters/prisma/trust-record.repository.ts`
- RNF-004 (org-scoping a nivel de query)
