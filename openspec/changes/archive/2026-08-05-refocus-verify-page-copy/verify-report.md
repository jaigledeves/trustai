# Verification Report

**Change**: `refocus-verify-page-copy`
**Version**: N/A (delta spec, no prior canonical `web-public-verify` spec)
**Mode**: Strict TDD
**Branch**: `feat/verify-page-copy`

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 34 (Phases 1–8, excluding the forecast table) |
| Tasks complete | 34 |
| Tasks incomplete | 0 |

All checkboxes in `tasks.md` are `[x]`. Cross-checked against the actual diff and source — the RED→GREEN sequencing is plausible and the described end states match the current files (verified below, not just trusted from the checklist).

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm --filter @trustai/web build
✓ Compiled successfully in 1734ms
✓ Generating static pages using 15 workers (11/11) in 827ms

Route (app)
...
└ ƒ /verify/[id]

ƒ  (Dynamic)  server-rendered on demand
```
`/verify/[id]` is listed under `ƒ` (Dynamic), NOT `○` (Static) — confirms it still reads `params` and is server-rendered on demand, per design.md.

**Tests**: ✅ 231 passed / ❌ 0 failed / ⚠️ 0 skipped (52 test files)
```text
$ pnpm --filter @trustai/web test
Test Files  52 passed (52)
     Tests  231 passed (231)
```
Includes all task-referenced files: `dictionaries.test.ts` (24 tests), `HashOnlyCard.test.tsx` (2), `ClientHashRecompute.test.tsx` (5), `not-found.test.tsx` (1), `page.test.tsx` (2), `UploadVerdictPanel.test.tsx` (5), and the unmodified `VerificationDemo.test.tsx` (6, cross-read confirmed green). The `stderr` output under `app/error.test.tsx` is that test's own intentional thrown-error fixture output (`Error: backend down`, `Error: boom`) for the error-boundary assertions — not a failure, unrelated to this change.

**Lint**: ✅ No errors (`pnpm --filter @trustai/web lint` — clean, zero output)
**Typecheck**: ✅ No errors (`pnpm --filter @trustai/web typecheck` — clean, zero output)

**Coverage** (changed files, `vitest --coverage`):

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|------------------|--------|
| `dictionaries/es/verify.ts` | 100% | 100% | — | ✅ Excellent |
| `components/verify/ClientHashRecompute.tsx` | 100% | 100% | — | ✅ Excellent |
| `components/verify/HashOnlyCard.tsx` | 92.39% | 65.21% | ~L87, L99, L123-124 (pre-existing txHash/explorerUrl-absent branch and generic-error rethrow — not new code from this change) | ⚠️ Acceptable |
| `app/verify/[id]/not-found.tsx` | 100% | 100% | — | ✅ Excellent |
| `app/verify/[id]/page.tsx` | not isolable via CLI glob (dynamic `import("./page")` + bracket-path glob quirk in vitest CLI) — both branches (enabled/disabled) are exercised by `page.test.tsx`'s 2 tests, confirmed by full-suite pass | — | ➖ Tooling-limited, not a gap |

Coverage is informational per Strict TDD rules — no CRITICAL findings.

**Gate — zero `apps/api` changes**: ✅ Confirmed
```text
$ git diff --stat -- apps/api
(empty output)
```
Full `git diff --stat` shows exactly the 11 `apps/web` files listed in the proposal plus `docs/architecture/decisions.md` (163 insertions, 65 deletions across 12 files) plus the new `docs/adr/ADR-009-*.md` (untracked). No file under `apps/api/**` appears anywhere in `git status --short`.

## Spec Compliance Matrix

### ADDED Requirements (this change)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Web-Owned Verdict & Legal Copy | HashOnlyCard renders dictionary copy, not server strings | `HashOnlyCard.test.tsx:11-47` (mocks `explanation`/`disclaimer` as `"SERVER_..._SHOULD_NOT_RENDER"`, asserts `queryByText` finds neither; asserts `legal.disclaimer`/`legal.disclaimerLabel` present) | ✅ COMPLIANT |
| Plain-Language Verdict Copy (No Jargon) | No bare jargon; shared keys stay non-empty | `dictionaries.test.ts:181-187` (no `\bDTR\b`/`SHA-256`/`hash canónico` in any `verdicts.*.message`); `dictionaries.test.ts:211-216` (all 4 `title`/`message` non-empty, backs `VerificationDemo`'s live read) | ✅ COMPLIANT |
| Corrected eIDAS Disclaimer (No Authorship Overclaim) | Disclaimer references eIDAS without authorship claim | `dictionaries.test.ts:189-197` (matches `eIDAS\|firma electrónica cualificada`; does not match `autor\|pertenece\|propiedad`/`autoría\|author`) | ✅ COMPLIANT |
| Honest Testnet Badge | Badge stays accurate and non-apologetic | `dictionaries.test.ts:205-209` (matches `Base Sepolia`; does not match `\(testnet\)`/`mainnet\|producci[oó]n`) | ✅ COMPLIANT |
| Caveat in Secondary Disclosure | Caveat is collapsed by default and expandable | `ClientHashRecompute.test.tsx:59-70` (finds `<summary>{caveatLabel}</summary>`, asserts caveat `<p>` is `.closest("details")`-contained) | ✅ COMPLIANT |
| Helpful Empty/Not-Found States | Link-specific not-found and a recovery pointer | `not-found.test.tsx:8-30` (`notFound.title`/`.description`/home link); `page.test.tsx:33-46` (disabled branch asserts `page.disabled.message` + home link `href="/"`) | ✅ COMPLIANT |

### Baseline Requirements (locked by this change's spec, pre-existing behavior)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Public No-Auth Verification Page | No-auth render, flag-gated, only two client islands | `page.test.tsx:21-31` (enabled: no login link); `page.test.tsx:33-46` (disabled: neither component mounts) | ✅ COMPLIANT |
| Hash-Only GET & 404 Asymmetry (INV-41) | Analysis gated to POST verdicts; GET/POST 404 asymmetry | `HashOnlyCard.test.tsx:46` (`queryByText(/Resumen\|Clasificación\|Idioma/)` absent on GET); `HashOnlyCard.test.tsx:49-59` (unknown id → `NEXT_HTTP_ERROR_FALLBACK;404`); `UploadVerdictPanel.test.tsx` (POST never 404s, all 4 verdicts render 200) | ✅ COMPLIANT |
| Four Verdicts | Each verdict renders its dictionary copy and color | `UploadVerdictPanel.test.tsx` (VALID/ASSET_MISMATCH/PENDING_ANCHOR/INVALID_RECORD cases, reworded messages asserted via `verifyDictionary.verdicts.*.message` post-diff) | ✅ COMPLIANT |
| Client-Side Hash Recompute Honesty | Caveat preserves the honesty boundary | `dictionaries.test.ts:199-203` (`recompute.caveat` still matches the no-reconstruction regex); `ClientHashRecompute.test.tsx:59-70` (renders the exact tightened caveat text) | ✅ COMPLIANT |

**Compliance summary**: 10/10 scenarios compliant.

## Correctness (Static Evidence)

| Req item | Status | Notes |
|---|---|---|
| `HashOnlyCard.tsx` never reads `result.explanation`/`.disclaimer` | ✅ Confirmed | `HashOnlyCard.tsx:30-34,105-111` — only `result.verdict`, `.documentIntegrity`, `.chainAnchor`, `.verifiedAt` are read; disclaimer block sources `verifyDictionary.legal.disclaimerLabel`/`.disclaimer` (lines 106-107) |
| `legal.disclaimer` source comment gates pending sign-off | ✅ Confirmed | `verify.ts:49` — `// PENDING legal sign-off before mainnet/production — see ADR-009`, never rendered (not read by any component) |
| No new `'use client'` boundary | ✅ Confirmed | `ClientHashRecompute.tsx:1` retains its pre-existing `'use client'`; `page.tsx`, `HashOnlyCard.tsx`, `not-found.tsx` have none |
| `VerifyHashResponse` (INV-41) unchanged | ✅ Confirmed | `git diff --stat -- apps/web/lib/api/types.ts` empty; `types.ts:123-130` has no `analysis` field |
| `apps/api` untouched | ✅ Confirmed | `git diff --stat -- apps/api` empty |
| ADR-009 exists and index updated | ✅ Confirmed | `docs/adr/ADR-009-web-dueno-del-copy-de-veredictos-y-aviso-eidas.md` present (untracked/new); `docs/architecture/decisions.md:29` lists the row |
| `UploadVerdictPanel.tsx` source unmodified | ✅ Confirmed | `git diff --stat -- apps/web/components/verify/UploadVerdictPanel.tsx` empty — only its test changed (2 literal→dictionary-key assertion updates, matching the reworded messages) |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Single `verdicts.*.message`, no split explanation field | ✅ Yes | `verify.ts:63-83` — one `title`/`message` pair per verdict, `landing.explanationLabel` removed |
| Disclaimer placement: new top-level `legal` group | ✅ Yes | `verify.ts:47-52` |
| Pending sign-off marker as internal comment only | ✅ Yes | `verify.ts:49` |
| Recompute disclosure trigger: `recompute.caveatLabel` | ✅ Yes | `verify.ts:92`, wired at `ClientHashRecompute.tsx:79` |
| API string on the wire untouched, legacy per ADR-009 | ✅ Yes | Zero `apps/api` diff |
| `not-found.tsx` recovery link source | ⚠️ Deviation (documented) | Design.md said "keeps `shellDictionary.appName`"; apply used `verifyDictionary.notFound.homeLinkLabel` instead, per explicit apply-time instruction recorded in `tasks.md:64`. Additive, does not break the "persistent layout header" requirement — layout's own brand link still exists and is asserted separately (`not-found.test.tsx:24-29`). |
| `HashOnlyCard.tsx`/`ClientHashRecompute.tsx`/`not-found.tsx`/`page.tsx` component-change table | ✅ Yes | All four match design.md's "Component Changes" table exactly (badge/pill/tx row/`verifiedAt` untouched, `title`/`hashLabel` outside `<details>`) |

## TDD Compliance

No `apply-progress` artifact was persisted for this change (openspec filesystem mode; the RED/GREEN sequencing is documented only in `tasks.md`'s per-task checkboxes, not a separate TDD-evidence table). Per the Strict TDD module, absence of a "TDD Cycle Evidence" table is normally CRITICAL; downgraded here to WARNING because:
- `tasks.md` itself documents the RED→GREEN sequence per phase (RED task → run test expecting failure → GREEN task → run test expecting pass), for all 5 implementation phases (2–6).
- Every test file described as the "RED" step in `tasks.md`/`design.md` exists and currently passes (cross-referenced by reading `dictionaries.test.ts`, `HashOnlyCard.test.tsx`, `ClientHashRecompute.test.tsx`, `not-found.test.tsx`, `page.test.tsx` directly — all assert the GREEN-phase behavior described in the same tasks).
- Triangulation is adequate: `ClientHashRecompute.test.tsx` has 2 distinct-value hash tests (`"a".repeat(64)` vs `"b".repeat(64)` for different files), an error-state test, and a stale-hash-clearing test — not single-case.

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | No dedicated apply-progress artifact; RED/GREEN steps documented inline in `tasks.md` per phase |
| All tasks have tests | ✅ | 5/5 implementation phases (2–6) have a paired test file |
| RED confirmed (tests exist) | ✅ | 5/5 test files verified present |
| GREEN confirmed (tests pass) | ✅ | 231/231 tests pass on execution |
| Triangulation adequate | ✅ | `ClientHashRecompute.test.tsx` has 5 distinct-scenario tests; `dictionaries.test.ts` verify-audit block has 5 distinct-assertion tests |
| Safety Net for modified files | ✅ | Full suite (52 files) run and green after all edits, including all pre-existing modified-file tests (`UploadVerdictPanel.test.tsx`, `VerificationDemo.test.tsx`) |

**TDD Compliance**: 5/6 checks fully passed, 1 WARNING (no separate evidence artifact — informational, not blocking given inline documentation + verified runtime evidence).

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 5 | 1 (`dictionaries.test.ts` copy-audit block) | vitest |
| Integration | 17 | 6 (`HashOnlyCard`, `ClientHashRecompute`, `not-found`, `page`, `UploadVerdictPanel`, `VerificationDemo`) | vitest + Testing Library + MSW |
| E2E | 0 | 0 | Playwright installed, not used for this change |
| **Total (this change's scope)** | **22** | **7** | |

### Assertion Quality

No trivial/tautological assertions found across the 7 changed/relevant test files. All assertions call into rendered component output or dictionary values with distinct expected strings; the `for...of Object.values(verifyDictionary.verdicts)` loops in `dictionaries.test.ts` iterate a fixed 4-key `as const` object literal (never empty by construction), so they are not "ghost loops" over a possibly-empty runtime collection.

**Assertion quality**: ✅ All assertions verify real behavior

### Quality Metrics
**Linter**: ✅ No errors
**Type Checker**: ✅ No errors

## Issues Found

**CRITICAL**: None

**WARNING**:
1. No dedicated `apply-progress`/TDD-evidence artifact was persisted for this change — RED/GREEN sequencing is only traceable via `tasks.md`'s inline phase structure plus direct source/test verification (see TDD Compliance section). Recommend persisting a TDD evidence table in future strict-TDD changes for faster audit.
2. `HashOnlyCard.tsx` branch coverage is 65.21% (uncovered: the "not anchored"/no-`txHash`/no-`explorerUrl` render path, and the non-`NotFoundError` rethrow path in `fetchHash`). Both are pre-existing branches, not newly introduced by this change, and are not required by any scenario in this change's spec delta — flagged for awareness only.

**SUGGESTION**:
1. `page.tsx`/`not-found.tsx` per-file coverage could not be isolated via the vitest CLI `--coverage.include` glob due to the `[id]` bracket segment in the path; functional correctness is already fully confirmed by the full-suite pass (both tests, both branches, exercised). Consider a `coverage.json`-based extraction script if per-file coverage on bracketed app-router paths becomes a recurring need.

## Verdict

**PASS**

All 34 tasks are genuinely complete and independently verified against source (not trusted from the checklist alone). All 10 spec scenarios (6 ADDED + 4 baseline) have passing covering tests. Build succeeds with `/verify/[id]` confirmed dynamic (`ƒ`), lint/typecheck are clean, and `apps/api` has zero changes. Every explicit honesty guardrail (INV-41, no hash-reconstruction claim, no authorship claim, honest testnet badge, GET/POST 404 asymmetry) is intact and test-covered. ADR-009 and its index entry exist. The two WARNINGs (missing TDD-evidence artifact, one file's branch coverage) are non-blocking per Strict TDD rules — informational only, not spec or task failures.
