# Proposal: Paginate & Search the DTR List

## Intent

The `/dtrs` "Mis DTR" list is a dead-end past the first page: the backend
already paginates (`page`/`pageSize`, `total`) but the RSC never sends those
params and the UI has no controls, so records beyond the first 20 are
unreachable and there is no way to find a document. Add pagination controls, a
filename search, and a state filter — reusing the pagination plumbing that
already exists end-to-end.

## Scope

**Packages**: `apps/api` (query DTO + repo `where` filters) and `apps/web`
(list page + controls). No `dtr-core`/`utils`/`smart-contracts`; no schema
migration.

### In Scope
- Backend: optional `search` (filename, case-insensitive `contains`) and
  `state` (one of `TrustRecordState`) query params on `GET /trust-records`,
  validated via a new query DTO; threaded into the org-scoped Prisma `where`.
- Backend: keep existing `page`/`pageSize` behaviour (defaults 1/20, `pageSize`
  capped at 100) — fold them into the same query DTO.
- Frontend: URL-driven (`searchParams`) search input + state `<select>` +
  prev/next pagination on `/dtrs`; page reads `searchParams`, forwards them via
  `serverFetch` `query`, and renders current page / total.
- Empty result of a *filtered* search shows a distinct "no matches" message
  (not the "certify your first document" onboarding empty-state).
- All copy via `dictionaries/es/history.ts` (RNF-041).

### Out of Scope
- `aiClassification` filter (free-form text; user deferred it).
- DB indexes on `createdAt`/`state`/`filename` (future perf change).
- Cursor pagination, saved filters, sorting-column UI, dark mode.

## Capabilities

### New Capabilities
- `web-dtr-list`: browse/paginate/search the org's DTR list — spans the
  `apps/web` `/dtrs` UI and the `apps/api` `GET /trust-records` query
  contract it depends on. No prior spec existed for this surface (it was
  built under the archived `web-frontend` change before specs were tracked).

### Modified Capabilities
- None. `web-visual-coherence` covers styling only; the new controls follow it.

## Approach

Backend introduces `ListTrustRecordsQueryDto` (`page`, `pageSize`, optional
`search`, optional `state`), replacing the controller's bare
`@Query`+pipe params (establishing the repo's first validated query-DTO
convention — an ADR-worthy tradeoff). The repo `findAllForOrganization` gains a
`filters` argument merged into the existing `where`
(`asset: { organizationId, filename: { contains, mode: "insensitive" } }`
+ top-level `state`). Frontend `/dtrs` becomes `searchParams`-driven: a
client `DtrListControls` (debounced search input + state select) pushes to the
URL; a `DtrPagination` renders prev/next from `page`/`pageSize`/`total`. The
RSC forwards the params through `serverFetch`'s existing `query` support.

## Affected Areas

| Area | Impact |
|------|--------|
| `dto/list-trust-records-query.dto.ts` (api, new) | Validated query params |
| `trust-records.controller.ts` (api) | Use query DTO; pass filters to repo |
| `ports/trust-record-repository.port.ts` (api) | `findAllForOrganization` filters arg |
| `adapters/prisma/trust-record.repository.ts` (api) | Filtered `where` |
| `dto/trust-record-list-response.dto.ts` (api) | (unchanged shape) |
| `app/(dashboard)/dtrs/page.tsx` (web) | Read `searchParams`, forward to fetch |
| `components/history/DtrListControls.tsx` (web, new) | Search + state filter |
| `components/history/DtrPagination.tsx` (web, new) | Prev/next controls |
| `components/history/DtrTable.tsx` (web) | Filtered-empty vs onboarding-empty |
| `lib/api/types.ts` (web) | Query-param helper type (if needed) |
| `dictionaries/es/history.ts` (web) | New search/filter/pagination copy |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `whitelist:true` silently drops a mistyped param | Medium | Query DTO with explicit fields + unit test for unknown/invalid |
| Case-sensitive filename search on some collations | Medium | Prisma `mode: "insensitive"` + e2e assertion |
| Invalid `state` value → 500 | Low | `@IsEnum(TrustRecordState)` + 400 test |
| Full scan on large orgs (no index) | Low (MVP scale) | Out of scope; noted as future perf change |
| `searchParams` API differs in this Next.js | Medium | Read `node_modules/next/dist/docs/` before coding (AGENTS.md) |

## Rollback Plan

Additive and independent per side. Backend: `git revert` the query-DTO/repo
commit — the endpoint returns to `page`/`pageSize`-only (no migration, no data
change). Frontend: `git revert` the UI commit — `/dtrs` returns to the
first-page-only view. Neither revert affects the other.

## Dependencies

None external.

## Success Criteria

- [ ] `GET /trust-records?search=&state=&page=&pageSize=` filters org-scoped,
      validates inputs (400 on bad `state`), and keeps the `{items,total,page,pageSize}` shape.
- [ ] filename search is case-insensitive and org-scoped (no cross-org leak).
- [ ] `/dtrs` shows working prev/next; deep-linking a URL with params renders that page/filter.
- [ ] Filtered no-match shows a distinct message from the onboarding empty-state.
- [ ] `@trustai/api` and `@trustai/web` unit tests + api e2e green; typecheck/lint clean.
