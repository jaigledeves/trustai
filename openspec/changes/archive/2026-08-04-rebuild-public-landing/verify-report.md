# Verification Report

**Change**: rebuild-public-landing
**Version**: N/A (first spec for `public-landing`)
**Mode**: Strict TDD

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

All 17 tasks across 7 phases are checked `[x]` in `tasks.md`. Cross-referenced against the codebase: every file the tasks describe exists (`contractUrl.ts`, all 9 `components/landing/*.tsx`, `VerificationDemo.test.tsx`, `useClientBoundary.test.ts`, `app/page.tsx`, `app/page.test.tsx`, the `landing.ts` rewrite, the `dictionaries.test.ts` extension).

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm --filter @trustai/web build
✓ Compiled successfully in 2.5s
✓ Generating static pages using 15 workers (11/11)
Route (app): ○ / (prerendered as static content)
```

**Typecheck**: ✅ Passed (`tsc -p tsconfig.json --noEmit`, no output/errors)

**Lint**: ✅ Passed (`eslint`, no output/errors)

**Tests**: ✅ 159 passed / 0 failed / 0 skipped (34 test files)
```text
$ pnpm --filter @trustai/web test
Test Files  34 passed (34)
     Tests  159 passed (159)
```
Includes all landing-specific suites: `VerificationDemo.test.tsx` (6), `useClientBoundary.test.ts` (10), `dictionaries.test.ts` (17, incl. the 9-assertion copy audit), `app/page.test.tsx` (3). Two `stderr` traces ("backend down", "boom") are expected console output from pre-existing `app/error.test.tsx` error-boundary cases, not landing-related failures.

**Coverage**: Not applicable — `coverage_threshold: 0` per `openspec/config.yaml`, no coverage tool run.

**Scope note**: Only `pnpm --filter @trustai/web {test,typecheck,lint,build}` were re-run this session (change is `web`-only per proposal.md's stated scope; `git status` confirms zero files touched outside `apps/web/` and `openspec/`). Full-monorepo `pnpm -r test`/`pnpm -r build` were already confirmed green during the apply phase and are unaffected — not re-run here to avoid redundant work, since `apps/api`, `packages/dtr-core`, `packages/utils`, and `smart-contracts` have zero diff.

## Spec Compliance Matrix

**Correction**: the spec has **9 requirements / 18 scenarios** (verified by counting `#### Scenario:` headers), not 21 as stated in the task brief.

| # | Requirement | Scenario | Test | Result |
|---|---|---|---|---|
| 1 | Landing Composition | Page renders all sections in order | `app/page.test.tsx > renders Nav, Hero, ... in that order` | ✅ COMPLIANT |
| 2 | Landing Composition | Only VerificationDemo ships client JS | `components/landing/useClientBoundary.test.ts` (10 cases, one per file) | ✅ COMPLIANT |
| 3 | Dictionary-Sourced Copy (RNF-041) | No inline literal copy in a section | *(none — no source-scanning test exists anywhere in the repo for this pattern)* | ❌ UNTESTED — see note below |
| 4 | Dictionary-Sourced Copy (RNF-041) | New dictionary groups present & non-empty | `dictionaries.test.ts > every leaf value in landingDictionary is a non-empty string` | ✅ COMPLIANT |
| 5 | Light-Mode-Only Styling | No dark-mode or success-token artifacts | *(none — verified via manual `git diff`/grep, not an automated test)* | ❌ UNTESTED — see note below |
| 6 | Central Artifact Terminology Lock | Exact terminology asserted in tests | `dictionaries.test.ts > 1. terminology lock` | ✅ COMPLIANT |
| 7 | Honest Verification Demo | Toggling shows each real verdict's copy | `VerificationDemo.test.tsx` (default VALID + 3 toggle cases + revert-to-VALID case) | ✅ COMPLIANT |
| 8 | Honest Verification Demo | No on-chain comparison claim | `dictionaries.test.ts > 3. no on-chain comparison claim` | ✅ COMPLIANT |
| 9 | Honest Verification Demo | Optional recompute caveat matches verify.ts pattern | `dictionaries.test.ts > 8.` + `VerificationDemo.test.tsx > renders the static recompute disclosure once...` | ✅ COMPLIANT |
| 10 | Accurate Anchoring Copy | HowItWorks step 3 states canonical-serialization hash | `dictionaries.test.ts > 7.` | ✅ COMPLIANT |
| 11 | Accurate Anchoring Copy | No "file hash is anchored" claim anywhere | `dictionaries.test.ts > 2. accurate anchoring` | ✅ COMPLIANT |
| 12 | Content-Audit Accuracy | Use-case copy avoids authorship/ownership claims | `dictionaries.test.ts > 4.` | ✅ COMPLIANT |
| 13 | Content-Audit Accuracy | FAQ has no pricing promise | `dictionaries.test.ts > 5.` | ✅ COMPLIANT |
| 14 | Content-Audit Accuracy | Step 1 names the real encryption algorithm | `dictionaries.test.ts > 6.` | ✅ COMPLIANT |
| 15 | Config-Driven Navigation & Links | Demo verification CTA hidden when unset | `app/page.test.tsx > hides the demo-verification CTA when config.demoDtrId is unset` | ✅ COMPLIANT |
| 16 | Config-Driven Navigation & Links | Demo verification CTA shown when set | `app/page.test.tsx > renders the guarded demo-verification CTA ...` | ✅ COMPLIANT |
| 17 | Test Coverage (strict_tdd) | VerificationDemo test covers all four verdicts | `VerificationDemo.test.tsx` | ✅ COMPLIANT |
| 18 | Test Coverage (strict_tdd) | page.tsx gets its first test | `app/page.test.tsx` (new file) | ✅ COMPLIANT |

**Compliance summary**: 16/18 scenarios compliant with a runtime-passing covering test. 2/18 (rows 3, 5) have no automated covering test; both were manually verified compliant this session (see notes below) but carry no regression protection.

### Notes on the 2 untested scenarios

- **Row 3 (no inline literal copy)**: Manually grepped every `.tsx` file in `components/landing/` + `app/page.tsx` for JSX text nodes (`>[A-Za-z...]`), `aria-label="literal"`, `alt="literal"`, and template-literal children — zero violations found; every rendered text node traces to a `landingDictionary` key. This is **not a regression specific to this change** — no test anywhere in `apps/web` scans component source for inline literals (the existing `dictionaries.test.ts` leaf-guard only validates the dictionary itself, never consuming components). `useClientBoundary.test.ts` already establishes the exact pattern needed (read source files, assert on their content) — extending it to scan for literal JSX text would close this gap cheaply.
- **Row 5 (no dark-mode/success-token artifacts)**: `git diff`/`git status` confirm `apps/web/app/globals.css` has zero changes in this commit set (last touched in `ba6a3df`, a prior, unrelated commit) — the `.dark`/`--success` rules that exist there are pre-existing and out of this change's diff, satisfying the scenario's literal wording ("the diff introduced by this change"). Grepped all `components/landing/*` for `.dark`, `prefers-color-scheme`, `next-themes`, `--success` — zero matches. Confirmed success/live indicators use `emerald-*` (`bg-emerald-500`, `text-emerald-600`, `bg-emerald-50` in `Hero.tsx`; `bg-emerald-50`/`text-emerald-600` in `VerificationDemo.tsx`). No automated test encodes this check.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Landing Composition | ✅ Implemented | `page.tsx` composes exactly 9 sections in spec order; only `VerificationDemo.tsx` has `"use client"` |
| Dictionary-Sourced Copy (RNF-041) | ✅ Implemented | All 9 groups (`nav`,`hero`,`how`,`verificationDemo`,`useCases`,`pillars`,`faq`,`cta`,`footer`) present in `landing.ts`; no inline literals found in components |
| Light-Mode-Only Styling | ✅ Implemented | No `.dark`/`prefers-color-scheme`/`next-themes`/`--success*` introduced; `emerald-*` used throughout |
| Central Artifact Terminology Lock | ✅ Implemented | "Registro Digital de Confianza (DTR)" appears verbatim in `hero.subtitle`, `hero.card.label`, `cta.subtitle` |
| Honest Verification Demo | ✅ Implemented | `VerificationDemo.tsx` sources `verifyDictionary.verdicts[key]` directly (no re-authoring); static recompute line has no `sha256Hex`/`useEffect` |
| Accurate Anchoring Copy | ✅ Implemented | `how.steps[2]` describes "hash SHA-256 de su serialización canónica"; no "file's hash" phrasing anywhere |
| Content-Audit Accuracy | ✅ Implemented | `useCases.items` claim only integrity/timestamp; `faq` pricing item reworded ("Durante el piloto... sin costo", no future-plan promise); `how.steps[0]` names AES-256-GCM |
| Config-Driven Navigation & Links | ✅ Implemented | `Hero.tsx`/`Footer.tsx` read `config.demoDtrId`/`config.chainExplorerBaseUrl` via `lib/config.ts`/`contractUrl.ts`; guarded with `config.demoDtrId ? ... : null` |
| Test Coverage (strict_tdd) | ✅ Implemented | Both new test files exist and pass |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| 9-component split (incl. Nav/Footer) | ✅ Yes | All 9 files exist under `components/landing/` |
| Shared `contractUrl.ts` | ✅ Yes | Exports `ANCHOR_CONTRACT`/`contractUrl`; imported by `Hero.tsx` and `Footer.tsx` |
| VerificationDemo recompute line (static, honest) | ✅ Yes | No `useEffect`/`sha256Hex`; static `statement`/`caveat` from dictionary |
| Verdict copy sourced, not mirrored | ✅ Yes | `VerificationDemo.tsx` reads `verifyDictionary.verdicts[key]` directly at render |
| FAQ via native `<details>/<summary>` | ✅ Yes | `Faq.tsx` — Server Component, no JS |
| No `--success` tokens | ✅ Yes | `emerald-*` utilities used instead |
| Server/Client boundary (only VerificationDemo client) | ✅ Yes | Confirmed by `useClientBoundary.test.ts` + manual read of all 9 files |

## Deviations Review (from apply-progress)

| # | Deviation | Spec/design conflict? | Verdict |
|---|---|---|---|
| 1 | Hero collapses design.md's literal 3-CTA list (`primaryCta`,`secondaryCta`,`demoCta`) into 2 rendered CTAs (`primaryCta`,`secondaryCta`) | No — spec's Config-Driven Navigation requirement only mandates the guarded `/verify/${demoDtrId}` link exists when set, which `secondaryCta` fulfills; `tasks.md` 3.2 and the finalized copy scope Hero to exactly 2 CTAs. Keeping an unused 3rd key would be dead code. | **ACCEPTED** |
| 2 | Copy-audit assertions 2 & 3 scoped to `hero/how/faq` and `verificationDemo` respectively, rather than the whole dictionary (design.md's table read more broadly) | No — spec.md's own scenario text explicitly scopes assertion 2 to "hero, how, faq groups" (line 135) and assertion 3 to "all `landingDictionary.verificationDemo` strings" (line 107). Scanning the whole tree would false-positive on `verificationDemo.recompute`'s legitimate "hash del archivo" wording. Spec is authoritative and more specific than design's table here. | **ACCEPTED** |
| 3 | Nav ships only login/register links + Wordmark, no in-page anchor menu (mock's `site-header.tsx` has one) | No — spec's Landing Composition requirement names Nav as a section but does not mandate anchor links; design.md explicitly marks `nav: {login, register}` "unchanged"; `tasks.md` 3.1 scopes Nav to exactly this. | **ACCEPTED** |

## Issues Found

**CRITICAL**: None (no test failures, no unchecked tasks, no build/lint/typecheck errors, no confirmed spec violations)

**WARNING**:
- Scenario "No inline literal copy in a section" has no automated covering test (manually verified clean this session — see notes above). Same systemic gap exists across the rest of `apps/web`, not introduced by this change.
- Scenario "No dark-mode or success-token artifacts" has no automated covering test (manually verified clean via `git diff` + grep this session — see notes above).

**SUGGESTION**:
- Extend `useClientBoundary.test.ts`'s file-scanning pattern (or add a sibling test) to grep `components/landing/*.tsx` + `app/page.tsx` source for literal JSX text nodes and `.dark`/`--success*`/`prefers-color-scheme` strings — would close both WARNING gaps cheaply and give this page the same regression protection `useClientBoundary.test.ts` already gives the "use client" boundary.
- The task brief's stated "21 scenarios" doesn't match the spec file (18, confirmed by counting `#### Scenario:` headers) — worth reconciling if that count is tracked elsewhere.

## Assertion Quality

No trivial/tautological assertions found in `VerificationDemo.test.tsx`, `dictionaries.test.ts`'s copy-audit block, `useClientBoundary.test.ts`, or `app/page.test.tsx`. All assertions call production code (render/toggle/import) and assert specific, non-trivial values (dictionary strings, DOM order via `indexOf`, `href` attributes, `aria-pressed` state). `useClientBoundary.test.ts`'s `it.each` loop iterates a non-empty, dynamically-read file list (asserted non-empty in a preceding test) — not a ghost loop. No mock-heavy tests (`VerificationDemo.test.tsx` uses zero mocks; `app/page.test.tsx` mocks only `VerificationDemo` itself, 1 mock vs. 3×3 assertions across its tests).

**Assertion quality**: ✅ All assertions verify real behavior

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | apply-progress (Engram #610) documents RED→GREEN for Phases 1, 4, 6; other phases (2, 3, 5, 7) are new-file creation/verification tasks without a red/green pair, consistent with tasks.md's own phrasing (only 1.1/1.2, 4.1/4.2, 6.1/6.2 are labeled RED/GREEN) |
| All tasks have tests | ✅ | Every task that produces testable behavior has a corresponding test file |
| RED confirmed (tests exist) | ✅ | `VerificationDemo.test.tsx`, `dictionaries.test.ts` extension, `app/page.test.tsx`, `useClientBoundary.test.ts` all exist |
| GREEN confirmed (tests pass) | ✅ | 159/159 passing on this session's run |
| Triangulation adequate | ✅ | `VerificationDemo.test.tsx` has 6 distinct cases for 4 verdicts + default + revert; copy-audit has 9 distinct assertions; `app/page.test.tsx` has 3 cases (order, shown, hidden) |
| Safety net for modified files | ✅ | `landing.ts`/`dictionaries.test.ts`/`page.tsx` were modified; full suite (34 files) re-run green, not just the touched files |

**TDD Compliance**: 6/6 checks passed

## Verdict

**PASS WITH WARNINGS**

All 17 tasks complete, all 159 tests pass, build/typecheck/lint clean, all 9 requirements implemented, all 3 apply-time deviations reviewed and accepted as spec-consistent, and 16/18 scenarios have a runtime-passing automated test. The 2 remaining scenarios (no inline literal copy; no dark-mode/success-token artifacts) were manually verified compliant with zero violations found, but lack automated regression coverage — a pre-existing gap in the codebase's testing conventions, not a defect introduced by this change. No product code was modified during this verification.
