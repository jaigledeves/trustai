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

- [ ] 2.1 Add copy keys to `apps/web/dictionaries/es/history.ts` under `list`:
  `searchLabel`, `searchPlaceholder`, `stateFilterLabel`, `stateFilterAll`,
  `noMatches`, `paginationPrevious`, `paginationNext`, `paginationPosition`
  (template fn). Reuse existing `states` map for option labels.
- [ ] 2.2 (test-first) `DtrListControls.test.tsx`: renders current `search`/`state`
  from props; typing search pushes updated URL (mock `next/navigation`) and
  resets page; selecting a state pushes `state` + resets page; clearing search
  removes the param.
- [ ] 2.3 Implement `components/history/DtrListControls.tsx` (`"use client"`,
  props `{ search?, state? }`, `useRouter`+`usePathname`, debounced search
  `router.replace`, state `<select>` `router.push`, page reset). shadcn/radix
  primitives; labels from dictionary.
- [ ] 2.4 (test-first) `DtrPagination.test.tsx`: Prev disabled at page 1; Next
  disabled when `page*pageSize>=total`; position text; navigating preserves
  `search`/`state`.
- [ ] 2.5 Implement `components/history/DtrPagination.tsx` (`"use client"`,
  props `{ page, pageSize, total, search?, state? }`, `useRouter`+`usePathname`).
- [ ] 2.6 (test-first) Update `DtrTable.test.tsx`: add `hasActiveFilter` — empty
  + filter → `noMatches`; empty + no filter → onboarding CTA (existing).
- [ ] 2.7 Add `hasActiveFilter` prop to `components/history/DtrTable.tsx` and
  branch the `total===0` message accordingly.
- [ ] 2.8 (test-first) `dtrs/page.test.tsx`: awaits `searchParams`, forwards
  `page`/`search`/`state` to `serverFetch` `query`, passes current values +
  `hasActiveFilter` down. (Mirror `[id]/page.test.tsx` pattern.)
- [ ] 2.9 Rewrite `app/(dashboard)/dtrs/page.tsx`: `PageProps<'/dtrs'>`,
  `await searchParams`, parse `page`/`search`/`state` (`parseState` guard),
  forward via `serverFetch`, render `DtrListControls` + `DtrTable` +
  `DtrPagination`. Update the header doc comment.
- [ ] 2.10 Sync `apps/web/lib/api/types.ts` if a query/param helper type is
  needed (mirror any new backend shape; response type already has page/pageSize).
- [ ] 2.11 Run web unit + typecheck + lint + `next build` green; open PR2.

## Phase 3 — Verify & archive

- [ ] 3.1 Full gate: `pnpm -r test` + `pnpm -r typecheck`; api e2e on Docker.
- [ ] 3.2 Write verify-report.md; confirm all success criteria in proposal.md.
- [ ] 3.3 Merge PR1 then PR2 to main; archive the change (promote
  `specs/web-dtr-list/spec.md` → `openspec/specs/web-dtr-list/spec.md`).
