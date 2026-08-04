# Proposal: Index TrustRecord for the state+date list query

## Intent

The `/dtrs` list filters by `state` and always orders by `createdAt desc`
(`findAllForOrganization`). `TrustRecord` has no index supporting that access
pattern (only `assetId`/`anchorId`). Add a composite `@@index([state, createdAt])`
so the state filter + date ordering is index-backed as record volume grows.

## Scope

**Packages**: `apps/api` (Prisma schema only). No app code, no API/DTO change,
no user-facing behavior change. This repo is schema-first via `prisma db push`
(script `db:deploy`) — there are no migration files to author.

### In Scope
- Add `@@index([state, createdAt])` to the `TrustRecord` model.
- Apply it to the dev DB via `prisma db push`.

### Out of Scope
- **Filename search index**: `ILIKE '%term%'` (case-insensitive `contains`) is
  NOT accelerated by a btree index — it needs a `pg_trgm` GIN index + the
  Postgres extension. Deliberately deferred (premature at MVP scale; see
  ADR-008 follow-up note).
- Denormalizing `organizationId` onto `TrustRecord` (bigger change).
- Any behavior change → no delta spec (non-functional).

## Approach

One schema line. `db push` creates the index (`CREATE INDEX ... ON
trust_records (state, createdAt)`) with no data change. Column order `(state,
createdAt)` matches the query: equality predicate on `state` first, then the
`createdAt` sort key.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/api/prisma/schema.prisma` (TrustRecord) | `+ @@index([state, createdAt])` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extra write cost per insert/update | Low | Single small composite; negligible at MVP volume |
| `db push` drift on a shared DB | Low | Dev-only; no prod data; index is additive |

## Rollback Plan

Additive and reversible: remove the `@@index` line and re-run `prisma db push`
(drops the index). No data migration, no code change.

## Success Criteria

- [ ] `@@index([state, createdAt])` present on `TrustRecord`; `prisma validate` clean.
- [ ] `prisma db push` applies the index to the dev DB.
- [ ] `@trustai/api` unit + e2e green (behavior unchanged); typecheck clean.
