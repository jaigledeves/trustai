# Tasks: Improve Certify Wizard Navigation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend → PR 2 frontend |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: port+adapter, DTO `asset` field, controller swap, e2e assertion | PR 1 | Base: main/tracker. ~150-200 lines |
| 2 | Frontend: types, `resolveWizardSteps`, `WizardStepper`, `DocumentContextHeader`, `CertifyWizard` restructure, `AnchorPoller` CTAs, dictionary | PR 2 | Base: PR 1 branch. ~550-700 lines — ask if sub-splitting needed |

## Phase 1: Backend — Repository Port & Adapter

- [x] 1.1 RED: extend `trust-record.repository.spec.ts` — failing test for `findByIdForOrganizationWithAsset` (`{ trustRecord, asset }`; `null` cross-org)
- [x] 1.2 GREEN: add `findByIdForOrganizationWithAsset(organizationId, id)` to `trust-record-repository.port.ts`
- [x] 1.3 GREEN: implement in `trust-record.repository.ts` via `findFirst({ where: { id, asset: { organizationId } }, include: { asset: true } })`

## Phase 2: Backend — DTO & Controller

- [x] 2.1 Add `TrustRecordAssetDetailDto` (`filename`, `sizeBytes`, `uploadedAt`) + `asset` field to `trust-record-detail-response.dto.ts`
- [x] 2.2 RED: create `trust-records.controller.spec.ts` — `getById` maps `asset` into DTO (mocked repository)
- [x] 2.3 GREEN: swap `getById` to `findByIdForOrganizationWithAsset`, map `asset`
- [ ] 2.4 Extend `certification-flow.e2e-spec.ts` to assert `asset.filename/sizeBytes/uploadedAt` — SKIPPED: requires a running anvil node (Foundry), not available in this environment. `isAnvilAvailable()` gates the whole suite via `describe.skipIf`. Unit coverage (1.1, 2.2) already exercises the mapping. Remains for the next batch or a CI run with anvil up.
- [x] 2.5 Run `pnpm --filter @trustai/api test` and `typecheck` — green (176 passed, 1 skipped; typecheck clean)

## Phase 3: Frontend — Types & Step Helper

- [ ] 3.1 Add `TrustRecordAssetDetail` + `asset` on `TrustRecordDetail` in `apps/web/lib/api/types.ts`
- [ ] 3.2 RED: `wizard-step.test.ts` — table-driven per spec scenarios (steps 3/4/certified, ANCHORING in-progress, analysis-fail step2, anchor-fail step4)
- [ ] 3.3 GREEN: create `wizard-step.ts` — `resolveWizardSteps`, reusing `hasAnalysisFailed` (`ReviewStep.tsx`) and `isAnalysisPending` (`analysis-poll-interval.ts`)

## Phase 4: Frontend — Presentational Components & Dictionary

- [ ] 4.1 RED: `WizardStepper.test.tsx` — completed/current/upcoming distinguishable
- [ ] 4.2 GREEN: create `WizardStepper.tsx`, labels from `certifyDictionary.stepper`
- [ ] 4.3 RED: `DocumentContextHeader.test.tsx` — filename/size/date render + null-filename fallback
- [ ] 4.4 GREEN: create `DocumentContextHeader.tsx`, fallback via `.documentContext.filenameFallback`
- [ ] 4.5 Add `stepper`, `documentContext` (incl. `filenameFallback`), `navigation.backToList` to `certify.ts`; update `dictionaries.test.ts` if needed

## Phase 5: Frontend — Wizard Integration & Terminal CTAs

- [ ] 5.1 RED: extend `CertifyWizard.test.tsx` — back-link incl. `ANCHORING`; header+stepper render above every branch incl. `DISCARDED`; `DISCARDED` CTAs present
- [ ] 5.2 GREEN: restructure `CertifyWizard.tsx` — hoist back-link/header/stepper above all branches, remove `DISCARDED` early return, add its CTAs
- [ ] 5.3 RED: extend `AnchorPoller.test.tsx` — `CERTIFIED` renders `viewDetailAction` + `.backToListAction` beside the explorer link
- [ ] 5.4 GREEN: add CTAs to `AnchorPoller.tsx` `CERTIFIED` panel via `StatusPanel`'s `action` slot
- [ ] 5.5 Add `discard.certifyAnotherAction/.backToListAction` and `anchor.viewDetailAction/.backToListAction` keys to `certify.ts`

## Phase 6: Verification

- [ ] 6.1 Run `pnpm --filter @trustai/api test` and `typecheck`; `pnpm --filter @trustai/web test` and `typecheck` — all green
- [ ] 6.2 Cross-check all 12 spec scenarios against tests in Phases 1-5
