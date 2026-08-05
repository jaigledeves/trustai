# Tasks: Improve App Copy — Jargon, Failure Reasons, DTR Explanation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200-280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending (not needed) |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low

## Phase 1: Rec 3 — Dictionary Rewording (Stepper, Anchor, Confirm)

- [x] 1.1 RED: `CertifyWizard.test.tsx` — update the frozen-hash assertion to expect `"Huella del registro"` (not the old jargon string); add a new assertion that clicking `confirm.frozenHashDisclosureLabel`'s trigger reveals `confirm.frozenHashDisclosure`
- [x] 1.2 RED: `CertifyWizard.test.tsx` — update the anchor-button assertion to `"Finalizar certificación"` (not `"Anclar en blockchain"`)
- [x] 1.3 RED: `ConfirmButton.test.tsx` — update both absent-hash-label assertions to `"Huella del registro"`
- [x] 1.4 RED: `AnchorPoller.test.tsx` — update all `"Anclar en blockchain"`, `"Anclando en la blockchain…"`, and `"...transacción on-chain."` assertions to the new copy
- [x] 1.5 GREEN: reword `certifyDictionary.stepper.anchorLabel`, `.confirm.frozenHashLabel`, `.anchor.submit`, `.anchor.anchoringMessage`, `.anchor.certifiedMessage` in `certify.ts`; add `.confirm.frozenHashDisclosureLabel` + `.confirm.frozenHashDisclosure`
- [x] 1.6 GREEN: add the `<details>/<summary>` disclosure to `CertifyWizard.tsx` beside the frozen-hash label (native HTML, `group-open:rotate-45` pattern from `Faq.tsx`)
- [x] 1.7 Run `pnpm --filter @trustai/web test -- CertifyWizard ConfirmButton AnchorPoller` — green

## Phase 2: Rec 3 — Dictionary Rewording (History Detail Card)

- [x] 2.1 RED: `DtrDetailCard.test.tsx` — update the `anchorNotAnchored` assertion to the reworded string
- [x] 2.2 GREEN: reword `historyDictionary.detail.canonicalHashLabel`, `.anchorTitle`, `.anchorNotAnchored` in `history.ts`
- [x] 2.3 Run `pnpm --filter @trustai/web test -- DtrDetailCard` — green

## Phase 3: Rec 4 — Localize `analysisFailureReason` (RNF-041 Fix)

- [x] 3.1 RED: `ReviewStep.test.tsx` — change the failure-banner assertion from the raw English string (`"no extractable text layer"`) to the expected localized Spanish message (`certifyDictionary.analysisError.noTextLayer`); add cases for the `"returned no content"` → `noContent` mapping and an unknown/dynamic reason → `generic` fallback
- [x] 3.2 GREEN: add `certifyDictionary.analysisError` (`noTextLayer`, `noContent`, `generic`) to `certify.ts`
- [x] 3.3 GREEN: add `localizeFailureReason()` to `ReviewStep.tsx`; render its result instead of the raw `record.analysisFailureReason`
- [x] 3.4 Run `pnpm --filter @trustai/web test -- ReviewStep` — green

## Phase 4: Rec 5 — DTR Explanation on `/dtrs`

- [x] 4.1 RED: `dtrs/page.test.tsx` — add a test asserting `historyDictionary.list.subtitle` renders below the heading
- [x] 4.2 GREEN: add `historyDictionary.list.subtitle` to `history.ts` (reusing the "Registro Digital de Confianza (DTR)" term)
- [x] 4.3 GREEN: render the subtitle `<p>` below the `<h1>` in `app/(dashboard)/dtrs/page.tsx`
- [x] 4.4 Run `pnpm --filter @trustai/web test -- dtrs/page` — green

## Phase 5: E2E Specs (Not Part of the RED/GREEN Loop — Must Not Be Left Broken)

- [x] 5.1 Update `apps/web/e2e/certify-golden-path.spec.ts` — reworded hash-label, anchor-button, and anchoring-message assertions
- [x] 5.2 Update `apps/web/e2e/public-verify.spec.ts` — same three reworded assertions (duplicated flow)

## Phase 6: Verification

- [x] 6.1 Run `pnpm --filter @trustai/web test` — full unit suite green
- [x] 6.2 Run `pnpm --filter @trustai/web lint` — green
- [x] 6.3 Run `pnpm --filter @trustai/web typecheck` — green
- [x] 6.4 Run `pnpm --filter @trustai/web build` — green
- [x] 6.5 Cross-check all new/modified spec scenarios (web-certify-flow delta, web-dtr-list delta) against tests added in Phases 1-4
