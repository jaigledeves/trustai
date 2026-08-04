# Tasks: Rebuild Public Landing Page

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1100–1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending — user to choose |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Dictionary + copy-audit tests + `contractUrl.ts` | PR 1 | Base main. ~300 lines |
| 2 | Nav, Hero, HowItWorks, Footer | PR 2 | Base PR 1. ~350 lines |
| 3 | UseCases, Pillars, Faq, FinalCta | PR 3 | Base PR 2. ~300 lines |
| 4 | VerificationDemo + guard test + `page.tsx`/test + verify | PR 4 | Base PR 3. ~350 lines |

## Phase 1: Dictionary Shape & Copy Audit

- [x] 1.1 RED — extend `dictionaries.test.ts`: register `landingDictionary` in the leaf-guard; add the 9-assertion copy-audit `describe` from design.md (terminology, anchoring, no on-chain-comparison, authorship, pricing, AES-256-GCM, canonical hash, recompute caveat, no "coincide"). Fails against `landing.ts`.
- [x] 1.2 GREEN — extend `apps/web/dictionaries/es/landing.ts` per design's Dictionary Shape: add `verificationDemo`, `useCases`, `faq`; correct `hero.card`, `how.steps[0]`/`[2]`; lock the DTR term. Run tests until green.

## Phase 2: Shared Contract URL Utility

- [x] 2.1 Create `apps/web/components/landing/contractUrl.ts` exporting `ANCHOR_CONTRACT`/`contractUrl` (moved from `page.tsx`).

## Phase 3: Static Server Sections

- [x] 3.1 Create `Nav.tsx` (login/register links, `Wordmark`).
- [x] 3.2 Create `Hero.tsx` (badge, title, value props, DTR card, `contractUrl` badge link, `/register` + guarded `/verify/${config.demoDtrId}` CTA).
- [x] 3.3 Create `HowItWorks.tsx` (4 steps).
- [x] 3.4 Create `UseCases.tsx` (6 items, integrity/timestamp-only copy).
- [x] 3.5 Create `Pillars.tsx` (3 items).
- [x] 3.6 Create `Faq.tsx` (native `<details>/<summary>`).
- [x] 3.7 Create `FinalCta.tsx`.
- [x] 3.8 Create `Footer.tsx` (`Wordmark iconOnly`, `contractUrl` link).

## Phase 4: Honest Verification Demo (Client Island)

- [x] 4.1 RED — write `VerificationDemo.test.tsx` (Testing Library + user-event): toggling each of the 4 verdicts renders `verifyDictionary.verdicts[key]`; default `VALID`; recompute statement/caveat render once regardless of verdict (Spec: Honest Verification Demo).
- [x] 4.2 GREEN — implement `VerificationDemo.tsx` (`'use client'`, `useState<VerifyVerdict>`, 4 `aria-pressed` buttons, `role="status"/"alert"` panel, static recompute disclosure). Run until green.

## Phase 5: Client Boundary Guard

- [x] 5.1 Write `useClientBoundary.test.ts`: reads each `components/landing/*.tsx` source; asserts only `VerificationDemo.tsx` starts with `"use client"` (Spec: only VerificationDemo ships client JS).

## Phase 6: Page Composition

- [x] 6.1 RED — write `app/page.test.tsx` (mirrors `verify/[id]/page.test.tsx`): mock `VerificationDemo`; assert 9-section order; two `vi.stubEnv("NEXT_PUBLIC_DEMO_DTR_ID", …)` cases for the guarded demo link (Spec: sections in order; Config-Driven Navigation).
- [x] 6.2 GREEN — rewrite `apps/web/app/page.tsx` as a thin Server Component composing the 9 sections, in order. Run until green.

## Phase 7: Final Verification

- [x] 7.1 Run `pnpm -r test`, `pnpm --filter @trustai/web typecheck`, `pnpm --filter @trustai/web lint`, `pnpm -r build`; confirm green, no `.dark`/`--success*`, no new deps.
