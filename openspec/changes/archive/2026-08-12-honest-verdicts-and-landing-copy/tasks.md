# Tasks: Honest Verdict Colors & De-duplicated Hero Copy

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~210-260 (1 new file + test, 5 file edits, 1 test-only confirmation) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full change (classifier + token + three components + Hero cleanup) | PR 1 | Small, cohesive `apps/web`-only diff; single PR is appropriate, no split needed |

## Phase 1: Shared Classifier — `lib/verify/verdict.ts` (RED → GREEN → REFACTOR)

- [x] 1.1 RED: create `apps/web/lib/verify/verdict.test.ts` asserting `classifyVerdict("VALID") === "success"`, `classifyVerdict("PENDING_ANCHOR") === "pending"`, `classifyVerdict("ASSET_MISMATCH") === "error"`, `classifyVerdict("INVALID_RECORD") === "error"`; run `pnpm --filter @trustai/web test verdict.test.ts` and confirm it fails (module doesn't exist yet).
- [x] 1.2 GREEN: create `apps/web/lib/verify/verdict.ts` exporting `VerdictSeverity`, `classifyVerdict()`, and `VERDICT_SEVERITY_STYLES` (per design.md's interface table: VALID→success/`bg-success/10 text-success`/`Check`/`status`; PENDING_ANCHOR→pending/`bg-warning/10 text-warning`/`Clock`/`status`; ASSET_MISMATCH & INVALID_RECORD→error/`bg-destructive/10 text-destructive`/`ShieldAlert`/`alert`); re-run 1.1's test to confirm green.
- [x] 1.3 REFACTOR: no extraction expected at this size; confirm no duplicate literals remain between the module and its test.

## Phase 2: `--warning` Design Token — `apps/web/app/globals.css`

- [x] 2.1 Add `--color-warning: var(--warning);` and `--color-warning-foreground: var(--warning-foreground);` to the `@theme inline` block, directly after the existing `--color-success-foreground` line (line 43).
- [x] 2.2 Add `--warning: oklch(0.5 0.15 75); --warning-foreground: oklch(0.985 0 0);` to `:root`, directly after `--success-foreground` (line 87).
- [x] 2.3 Add `--warning: oklch(0.82 0.165 84); --warning-foreground: oklch(0.18 0.02 84);` to `.dark`, directly after `--success-foreground` (line 123).
- [x] 2.4 Verify visually (dev server, both `:root` and `.dark`) that `bg-warning`/`text-warning` resolve; no dedicated CSS test exists — validated indirectly by Phase 3/4 component tests.

## Phase 3: `UploadVerdictPanel` — Shared Classifier + Pending State (RED → GREEN → REFACTOR)

- [x] 3.1 RED: in `apps/web/components/verify/UploadVerdictPanel.test.tsx`, extend the existing `PENDING_ANCHOR` case (around line 83) to assert `role="status"`, a `Clock` icon (or its accessible marker) is present, and `bg-success`/`text-success`/`Check` are NOT present for that outcome; run `pnpm --filter @trustai/web test UploadVerdictPanel.test.tsx` and confirm the new assertions fail.
- [x] 3.2 GREEN: in `apps/web/components/verify/UploadVerdictPanel.tsx`, delete the local `isErrorVerdict` (lines 174-176), import `classifyVerdict`/`VERDICT_SEVERITY_STYLES` from `../../lib/verify/verdict`, and rewrite `VerdictOutcome` (lines 178-196) to derive `role`, `className`, and `Icon` from the shared table instead of the binary `isError` split; re-run 3.1's test to confirm green.
- [x] 3.3 REFACTOR: confirm the existing VALID/ASSET_MISMATCH/INVALID_RECORD assertions in the same test file (lines 50-72, 74-81, 109-114) still pass unmodified; remove now-unused `Check`/`ShieldAlert` imports if the component no longer references them directly.

## Phase 4: `VerificationDemo` — Shared Classifier, Reorder, Icon (RED → GREEN → REFACTOR)

- [x] 4.1 RED: in `apps/web/components/landing/VerificationDemo.test.tsx`, add a DOM-order assertion (verdict buttons appear VALID, PENDING_ANCHOR, ASSET_MISMATCH, INVALID_RECORD) and strengthen the existing PENDING_ANCHOR case (lines 46-60) to assert no `bg-success`/`text-success`/`Check` marker is present; run `pnpm --filter @trustai/web test VerificationDemo.test.tsx` and confirm the new assertions fail.
- [x] 4.2 GREEN: in `apps/web/components/landing/VerificationDemo.tsx`: reorder `VERDICT_ORDER` (lines 10-15) to `["VALID", "PENDING_ANCHOR", "ASSET_MISMATCH", "INVALID_RECORD"]`; delete the local `isErrorVerdict` (lines 17-20); import `classifyVerdict`/`VERDICT_SEVERITY_STYLES` from `@/lib/verify/verdict`; rewrite the outcome `<div>` (lines 82-93) to use the shared table for `role`/`className` AND render the severity's `Icon` (previously icon-less — design.md decision); re-run 4.1's test to confirm green.
- [x] 4.3 REFACTOR: confirm the existing "defaults to VALID", "ASSET_MISMATCH as alert", "INVALID_RECORD as alert", "back to VALID" tests (lines 17-93) still pass unmodified with the new order and icon; remove any now-unused imports.

## Phase 5: `HashOnlyCard` — Shared Classifier for Verdict Title Color (RED → GREEN → REFACTOR)

- [x] 5.1 RED: in `apps/web/components/verify/HashOnlyCard.test.tsx`, add a case mocking `GET /public/verify/rec-1` with `verdict: "PENDING_ANCHOR"` (per the existing MSW precedent) and assert the verdict title element is NOT `text-success` and is styled as the pending/warning severity (not `text-destructive` either); keep/add a companion assertion that an error verdict (`ASSET_MISMATCH` or `INVALID_RECORD`) still renders `text-destructive` and `VALID` still renders `text-success`. Run `pnpm --filter @trustai/web test HashOnlyCard.test.tsx` and confirm the new PENDING_ANCHOR assertion fails (current code renders it `text-success`).
- [x] 5.2 GREEN: in `apps/web/components/verify/HashOnlyCard.tsx`, delete the local `isErrorVerdict` (lines ~16-18), import `classifyVerdict`/`VERDICT_SEVERITY_STYLES` from `../../lib/verify/verdict`, and change the verdict title's `<h2>` className (lines ~53-58) from the binary `isError ? "text-destructive" : "text-success"` to the three-state severity color (success→`text-success`, pending→`text-warning`, error→`text-destructive`) derived from `classifyVerdict(result.verdict)`. Do NOT change the `documentIntegrity` badge (lines ~63-77, stays binary — genuine boolean, not the pending-verdict issue) or the `anchored` badge (lines ~45-50). Do NOT add/change any `role` on the title — it's a heading, not a status/alert region. Re-run 5.1's test to confirm green.
- [x] 5.3 REFACTOR: confirm the existing VALID-path assertions in `HashOnlyCard.test.tsx` (lines 13-57, 59-88, 90-116, 118-128) still pass unmodified; remove any now-unused import in `HashOnlyCard.tsx` left over from the deleted `isErrorVerdict`.

## Phase 6: Hero Microcopy Removal

- [x] 6.1 RED (spec-driven, no new test needed — see design.md "No change" note): confirm current `dictionaries.test.ts` has no assertion that would need updating for this removal (already verified: `collectLeafValues(hero)` is generic, no hardcoded `ctaMicrocopy` reference).
- [x] 6.2 Remove `<p className="text-xs text-muted-foreground">{t.ctaMicrocopy}</p>` from `apps/web/components/landing/Hero.tsx` (line 60).
- [x] 6.3 Remove the `ctaMicrocopy: "Gratis · Sin tarjeta · Sin instalar nada",` key from `apps/web/dictionaries/es/landing.ts` (line 44).
- [x] 6.4 Run `pnpm --filter @trustai/web test dictionaries.test.ts` to CONFIRM it still passes post-removal (regression check, per design.md's "No change" testing-strategy row).

## Phase 7: Canonical Spec Reconciliation (flag for archive — do NOT edit `openspec/specs/` now)

- [ ] 7.1 At archive time (`sdd-archive`), rewrite `openspec/specs/public-landing/spec.md`'s "Light-Mode-Only Styling" requirement (currently: MUST NOT introduce `.dark` selectors or `--success*` properties; success indicators MUST use `emerald-*` only) to instead read: "Landing success/pending indicators use the `--success`/`--warning` semantic tokens (light + dark), consistent with the rest of the app" — per design.md's confirmed "Resolution" section. Update its scenario accordingly. This is the confirmed resolution of the flagged tension; do not perform it during `sdd-apply`.

## Phase 8: Full Verification Gate

- [x] 8.1 Run `pnpm --filter @trustai/web test` — all suites green, including `verdict.test.ts`, `UploadVerdictPanel.test.tsx`, `VerificationDemo.test.tsx`, `HashOnlyCard.test.tsx`, `dictionaries.test.ts`.
- [x] 8.2 Run `pnpm --filter @trustai/web lint`.
- [x] 8.3 Run `pnpm --filter @trustai/web typecheck`.
- [x] 8.4 Run `pnpm --filter @trustai/web build`.
- [x] 8.5 Confirm success criteria from `proposal.md`: no `Check`/green on `PENDING_ANCHOR` anywhere (including `HashOnlyCard`'s title); single shared classifier used by all three consumers (no duplicated `isErrorVerdict` in `UploadVerdictPanel.tsx`/`VerificationDemo.tsx`/`HashOnlyCard.tsx`); `VerificationDemo` button order is semaphore order; `--warning`/`--warning-foreground` exist in both `:root` and `.dark`; `Hero` no longer renders `ctaMicrocopy`; `verifyDictionary.verdicts` copy text unchanged.
