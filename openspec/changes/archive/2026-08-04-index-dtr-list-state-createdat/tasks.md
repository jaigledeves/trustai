# Tasks: Index TrustRecord for the state+date list query

Single work unit (one PR), schema-first (no migration files — `prisma db push`).

## Phase 1 — Schema + apply

- [x] 1.1 Added `@@index([state, createdAt])` to the `TrustRecord` model.
- [x] 1.2 `prisma validate` clean. (`prisma generate` blocked locally by a
  Windows DLL lock from the running api dev server — not a code issue; the
  index isn't in client types and CI/Linux regenerates fine.)
- [x] 1.3 `prisma db push` applied — DB in sync in 112ms.

## Phase 2 — Verify

- [x] 2.1 `pnpm --filter @trustai/api typecheck` clean.
- [x] 2.2 `pnpm --filter @trustai/api test` green (191, behavior unchanged).
- [x] 2.3 e2e `trust-records.e2e-spec` green (16/16) against the migrated DB.
- [x] 2.4 Confirmed via `pg_indexes`:
  `trust_records_state_createdAt_idx` = `btree (state, "createdAt")`.

## Phase 3 — Ship & archive

- [ ] 3.1 Commit (`perf(api): index trust_records (state, createdAt) for the list query`).
- [ ] 3.2 PR → main; merge on approval.
- [ ] 3.3 Archive the change (no spec to promote — non-functional).
