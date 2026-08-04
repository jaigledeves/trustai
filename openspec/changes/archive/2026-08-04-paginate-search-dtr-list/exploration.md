# Exploration: Paginate & Search the DTR List

## Question

The `/dtrs` "Mis DTR" list has no way to page through records or find a
document — everything after the first 20 is unreachable from the UI. What
must change, backend and frontend, to add pagination controls + a filename
search + a state filter?

## Current State (grounded in code)

### Backend — pagination already exists, filters do not
- `GET /trust-records` (`apps/api/src/modules/trust-records/trust-records.controller.ts:63-89`)
  already accepts `page`/`pageSize` (bare `@Query` + `DefaultValuePipe`/`ParseIntPipe`,
  clamped: `page>=1`, `pageSize` capped at `MAX_PAGE_SIZE = 100`). Returns
  `{ items, total, page, pageSize }`.
- No application use-case: the controller calls the repository port directly
  (`:82`).
- Port `findAllForOrganization(organizationId, page, pageSize)`
  (`apps/api/src/ports/trust-record-repository.port.ts:117-121`).
- Prisma adapter (`apps/api/src/adapters/prisma/trust-record.repository.ts:67-111`):
  `where = { asset: { organizationId } }` (RNF-004 org scoping at query level),
  `Promise.all([findMany, count])` — **`total` is already returned**,
  `orderBy: { createdAt: "desc" }`, `skip`/`take` offset pagination.
- **No filter query params anywhere.** No class-validator query DTO exists in
  the repo — closest pattern to mirror is `review-trust-record.dto.ts`
  (`@IsOptional`, `@IsIn`, `@IsString`).
- Global `ValidationPipe` in `main.ts:13-18` has `whitelist: true, transform: true`
  (unknown query props are silently stripped).

### Frontend — no controls at all
- `/dtrs` page (`apps/web/app/(dashboard)/dtrs/page.tsx:15-27`) is an RSC that
  does `serverFetch<TrustRecordListResponse>("/trust-records")` with **no query
  params** and **discards `page`/`pageSize`** from the response (`:24`).
- `serverFetch` already supports an `options.query` map
  (`apps/web/lib/api/server-client.ts:27-31`) — threading filters is trivial.
- `DtrTable` (`apps/web/components/history/DtrTable.tsx`) is pure presentational,
  props `{ items, total }`; `total === 0` → empty-state CTA.
- No pagination/search UI exists anywhere in the app (first of its kind).
- Copy lives in `apps/web/dictionaries/es/history.ts` (RNF-041 — no inline strings).
- Web mirror types already carry `page`/`pageSize`
  (`apps/web/lib/api/types.ts:89-104`).

### Data model
- `TrustRecordState` enum: `DRAFT, READY, ANCHORING, CERTIFIED, FAILED, DISCARDED`.
- Searchable filename lives on `DigitalAsset.filename` (nullable), reached via
  the `asset` relation — a filename search is a relation filter
  (`where: { asset: { organizationId, filename: { contains, mode: "insensitive" } } }`).
- No DB indexes on `createdAt`/`state`/`filename` today (acceptable at MVP
  scale; noted as a future optimization, not in scope).

## What makes this Easy vs Hard

**Easy:** offset pagination + `total` already implemented and tested end-to-end
(e2e `S-DTR-11`); `serverFetch` accepts `query`; web response type already has
`page`/`pageSize`; org-scoping pattern is centralized and consistent.

**Watch out:**
- No query-DTO convention yet — introducing a validated filter DTO is a new
  pattern (mind `whitelist: true`).
- filename is on `DigitalAsset` and case-sensitivity depends on collation → use
  Prisma `mode: "insensitive"`.
- Frontend URL-state is new; must be URL-driven via RSC `searchParams` on a
  **modified** Next.js (read `node_modules/next/dist/docs/` before coding, per
  `apps/web/AGENTS.md`).

## Direction

Extend the existing `web-history` list surface — not a new capability. Backend:
add optional `search` (filename, case-insensitive contains) + `state` (enum)
query params via a validated query DTO, threaded through the repo `where`.
Frontend: URL-driven search input + state select + prev/next pagination on
`/dtrs`. Scope confirmed with user: **filename search + state filter +
pagination UI** (no `aiClassification` filter).
