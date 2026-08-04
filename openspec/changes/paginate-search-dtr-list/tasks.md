# Tasks: Paginate & Search the DTR List

Two chained PRs (feature-branch-chain): PR1 backend contract, PR2 frontend UI
(depends on PR1's query params). Strict TDD — write the failing test first.

## Phase 1 — Backend: filtered query contract (PR1)

Branch: `feat/dtr-list-filters-backend`. Gate: `pnpm --filter @trustai/api test`
+ `typecheck`; e2e where noted (Docker).

- [x] 1.1 Add `TrustRecordListFilters { search?: string; state?: TrustRecordState }`
  to `apps/api/src/ports/trust-record-repository.port.ts` and widen
  `findAllForOrganization` with an optional 4th `filters?` arg.
- [x] 1.2 (test-first) repo spec cases: `state`, `search` (contains +
  `mode:"insensitive"`), both, no-filters unchanged, org scoping always present.
- [x] 1.3 Implement the compositional `where` in the Prisma adapter
  `findAllForOrganization` (kept `orderBy`/`skip`/`take`/`Promise.all` + clamps).
- [x] 1.4 Create `list-trust-records-query.dto.ts`. Decision change: numbers
  **clamp** via `@Transform` (not `@Min`/`@Max` reject) to preserve the
  S-DTR-11 contract; only `state` rejects (`@IsEnum` → 400). See ADR-008.
- [x] 1.5 (test-first) DTO unit spec: defaults, coercion, clamp 500→100 / 0→1,
  garbage→default, bad `state` fails, valid state+search, `@MaxLength(200)`.
- [x] 1.6 Refactor `TrustRecordsController.list` to `@Query() ListTrustRecordsQueryDto`,
  dropped bare pipes + `MAX_PAGE_SIZE`/`Math.min`, forwards `{search,state}`.
- [x] 1.7 (test-first) `list` tests in controller spec: defaults, filters
  forwarded, response envelope.
- [x] 1.8 Extended e2e S-DTR-12..16: state filter, case-insensitive search, bad
  state → 400, cross-org isolation, no-match empty. 16/16 green on Docker.
- [x] 1.9 Wrote `docs/adr/ADR-008-dto-de-query-validado-para-filtros-de-lista.md`.
- [x] 1.10 api unit (191) + typecheck green; e2e 16/16 green. Ready to open PR1.

## Phase 2 — Frontend: search, filter & pagination UI (PR2)

Branch: `feat/dtr-list-filters-web` (chained on PR1). Gate:
`pnpm --filter @trustai/web test` + `typecheck` + `lint` + `next build`.

- [x] 2.1 Added copy keys under `list`. `paginationPosition` is a placeholder
  STRING (`"Página {page} de {totalPages}"`), not a fn — the dictionaries.test
  guard requires every leaf be a non-empty string; the component substitutes.
- [x] 2.2 (test-first) `DtrListControls.test.tsx`: props reflected; debounced
  search push (real timers + `waitFor`, not fake timers — userEvent+fake timers
  hangs); state select push; page reset; clear removes param; state→all drops.
- [x] 2.3 Implemented `DtrListControls.tsx` (`"use client"`, props from RSC not
  `useSearchParams`, debounced `router.replace`, state `<select>` `router.push`).
- [x] 2.4 (test-first) `DtrPagination.test.tsx`: Prev/Next disabled edges,
  position text, filter preservation, back navigation.
- [x] 2.5 Implemented `DtrPagination.tsx`.
- [x] 2.6 (test-first) `DtrTable.test.tsx`: `hasActiveFilter` empty→noMatches vs
  onboarding CTA.
- [x] 2.7 Added `hasActiveFilter` prop + branch to `DtrTable.tsx`.
- [x] 2.8 (test-first) `dtrs/page.test.tsx`: forwards page/search/state to the
  backend query (MSW url capture), renders islands, hasActiveFilter threading.
- [x] 2.9 Rewrote `dtrs/page.tsx`: explicit props type (repo convention, not
  `PageProps`), `await searchParams`, guarded parse, forward, render islands.
- [x] 2.10 No web type change needed (response type already has page/pageSize).
- [x] 2.11 web unit 224 + typecheck + lint + `next build` green. `/dtrs` now
  dynamic (ƒ) due to searchParams. Ready to open PR2.

## Phase 3 — Verify & archive

- [ ] 3.1 Full gate: `pnpm -r test` + `pnpm -r typecheck`; api e2e on Docker.
- [ ] 3.2 Write verify-report.md; confirm all success criteria in proposal.md.
- [ ] 3.3 Merge PR1 then PR2 to main; archive the change (promote
  `specs/web-dtr-list/spec.md` → `openspec/specs/web-dtr-list/spec.md`).
