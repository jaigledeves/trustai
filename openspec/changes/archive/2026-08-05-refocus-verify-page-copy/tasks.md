# Tasks: Refocus Verify Page Copy

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-260 (1 dictionary, 3 components, 5 test files, no docs) |
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
| 1 | Full copy refocus (dictionary + 3 components + 5 tests) | PR 1 | Single cohesive commit set on `feat/verify-page-copy`; base = current default branch; copy/UI-only, no `apps/api` touch |

## Phase 1: Tests-First — Dictionary Audit (RED)

- [x] 1.1 In `apps/web/dictionaries/es/dictionaries.test.ts`, add a `verifyDictionary copy audit (spec: web-public-verify)` describe block asserting: none of the four `verdicts.*.message` match `/\bDTR\b/i` or `/SHA-256/i` or `/hash canónico/i`.
- [x] 1.2 In the same block, assert `verifyDictionary.legal.disclaimer` matches `/eIDAS|firma electrónica cualificada/i` and does NOT match `/autor|pertenece|propiedad/i`.
- [x] 1.3 In the same block, assert `verifyDictionary.recompute.caveat` still matches the existing no-reconstruction regex (mirrors dictionaries.test.ts:161-165's `verificationDemo.recompute.caveat` pattern, applied to `verifyDictionary.recompute.caveat`).
- [x] 1.4 In the same block, assert `verifyDictionary.page.badge` names `Base Sepolia`/testnet and does not match `/mainnet|producci[oó]n/i`.
- [x] 1.5 Run `pnpm --filter @trustai/web test dictionaries.test.ts` — new assertions MUST fail against current `verify.ts` (RED confirmed); leaf-value guard (line ~25) needs no edit, it auto-covers new `legal`/`notFound`/`disabled` leaves once added in Phase 2.

## Phase 2: GREEN — Dictionary (`verify.ts`)

- [x] 2.1 In `apps/web/dictionaries/es/verify.ts`, reword all four `verdicts.*.message` to plain language: no bare "DTR", "hash canónico", or "SHA-256"; keep the 4 `title`s unchanged.
- [x] 2.2 Remove `landing.explanationLabel`. Remove `landing.disclaimerLabel` (moves to `legal`, task 2.3).
- [x] 2.3 Add a new top-level `legal` group: `{ disclaimerLabel: string, disclaimer: string }`. `disclaimer` names eIDAS / "firma electrónica cualificada", states integrity + AI-analysis provenance only, no authorship/ownership claim. Add a source comment noting pending product/legal sign-off (ADR-009 gate) — never rendered.
- [x] 2.4 Reword `page.badge`: testnet/pilot framed as a strength (mirror `landingDictionary.hero.badge` tone), still names Base Sepolia/testnet.
- [x] 2.5 Replace flat `page.disabledMessage` with `page.disabled: { message: string, homeLinkLabel: string }` (keep the same message text under `.message`; add a new `homeLinkLabel`, e.g. "Volver al inicio").
- [x] 2.6 Add `recompute.caveatLabel` (new `<summary>` trigger text, e.g. "Cómo se calculó este hash"). Tighten `recompute.caveat` wording to drop the dead-end dtr-core doc-reference sentence while keeping the no-reconstruction claim intact.
- [x] 2.7 Add a new `notFound: { title: string }` group with link-specific "broken/expired" copy for `/verify/[id]`.
- [x] 2.8 Run `pnpm --filter @trustai/web test dictionaries.test.ts` — Phase 1 assertions and the existing leaf-guard/terminology tests MUST pass (GREEN).

## Phase 3: Tests-First — HashOnlyCard (RED → GREEN)

- [x] 3.1 RED — In `apps/web/components/verify/HashOnlyCard.test.tsx`, change the MSW mock's `explanation`/`disclaimer` values to distinctive strings not present in the dictionary (e.g. `"SERVER_EXPLANATION_SHOULD_NOT_RENDER"`), and assert `screen.queryByText(...)` finds neither.
- [x] 3.2 RED — In the same test, assert `screen.getByText(verifyDictionary.legal.disclaimer)` and the reworded `verifyDictionary.verdicts.VALID.message` are present.
- [x] 3.3 RED — Run `pnpm --filter @trustai/web test HashOnlyCard.test.tsx` — must fail against current `HashOnlyCard.tsx` (it still renders `result.explanation`/`result.disclaimer`).
- [x] 3.4 GREEN — In `apps/web/components/verify/HashOnlyCard.tsx`, remove the `explanationLabel`/`result.explanation` `<dt>/<dd>` block (lines ~74-77) entirely.
- [x] 3.5 GREEN — Repoint the disclaimer block: `t.disclaimerLabel` → `verifyDictionary.legal.disclaimerLabel`, `result.disclaimer` → `verifyDictionary.legal.disclaimer` (lines ~106-108). Leave badge/pill/tx row/`verifiedAt` untouched.
- [x] 3.6 GREEN — Run `pnpm --filter @trustai/web test HashOnlyCard.test.tsx` — must pass.

## Phase 4: Tests-First — ClientHashRecompute (RED → GREEN)

- [x] 4.1 RED — In `apps/web/components/verify/ClientHashRecompute.test.tsx`, update the caveat assertion (line ~64) to first assert the caveat text is NOT present pre-toggle (`queryByText` on the tightened caveat string), then click/`getByText(verifyDictionary.recompute.caveatLabel)`, then assert the caveat text IS present.
- [x] 4.2 RED — Run `pnpm --filter @trustai/web test ClientHashRecompute.test.tsx` — must fail against current always-visible `<p>{recompute.caveat}</p>`.
- [x] 4.3 GREEN — In `apps/web/components/verify/ClientHashRecompute.tsx`, wrap the caveat paragraph (lines ~77-79) in `<details><summary>{verifyDictionary.recompute.caveatLabel}</summary><p>{verifyDictionary.recompute.caveat}</p></details>`, mirroring the `HowItWorks.tsx`/`Faq.tsx` disclosure pattern. Keep `title`/`hashLabel`/hash rendering outside the `<details>`.
- [x] 4.4 GREEN — Run `pnpm --filter @trustai/web test ClientHashRecompute.test.tsx` — must pass, including the existing "never claims full on-chain hash re-derivation" test against the tightened caveat text.

## Phase 5: Tests-First — not-found.tsx (RED → GREEN)

- [x] 5.1 RED — In `apps/web/app/verify/[id]/not-found.test.tsx`, replace the `shellDictionary.errors.notFound` import/assertion with `verifyDictionary.notFound.title`; keep the two-home-link assertion (layout brand link + this page's recovery link) unchanged.
- [x] 5.2 RED — Run `pnpm --filter @trustai/web test not-found.test.tsx` — must fail against current `not-found.tsx`.
- [x] 5.3 GREEN — In `apps/web/app/verify/[id]/not-found.tsx`, replace the `shellDictionary` import/usage for the heading with `verifyDictionary.notFound.title`. **Deviation from this task's original wording** (see apply report): the recovery link was repointed to `verifyDictionary.notFound.homeLinkLabel` ("Ir a TrustAI") per explicit apply-time instruction, instead of keeping `shellDictionary.appName`; a `notFound.description` line was also added. Both additions are additive to design.md's `notFound` shape and still satisfy the persistent-layout-header requirement.
- [x] 5.4 GREEN — Run `pnpm --filter @trustai/web test not-found.test.tsx` — must pass.

## Phase 6: Tests-First — page.tsx disabled branch (RED → GREEN)

- [x] 6.1 RED — In `apps/web/app/verify/[id]/page.test.tsx`, repoint the disabled-branch literal assertion (line ~40) from `"La verificación pública no está disponible en este momento."` to `verifyDictionary.page.disabled.message`, and add an assertion for a home recovery link (`getByRole("link", { name: verifyDictionary.page.disabled.homeLinkLabel })` with `href="/"`).
- [x] 6.2 RED — Run `pnpm --filter @trustai/web test page.test.tsx` — must fail against current flat `t.disabledMessage` render (no link).
- [x] 6.3 GREEN — In `apps/web/app/verify/[id]/page.tsx`, replace the disabled branch's `{t.disabledMessage}` (line ~94) with `{t.disabled.message}` plus a new `<Link href="/">{t.disabled.homeLinkLabel}</Link>` alongside it.
- [x] 6.4 GREEN — Run `pnpm --filter @trustai/web test page.test.tsx` — must pass.

## Phase 7: Docs Confirmation

- [x] 7.1 Confirm `docs/adr/ADR-009-web-dueno-del-copy-de-veredictos-y-aviso-eidas.md` exists and matches the design's Option W decision (already authored in `sdd-design`) — no edit expected.
- [x] 7.2 Confirm `docs/architecture/decisions.md`'s registry table already lists the ADR-009 row (already added in `sdd-design`) — no edit expected.

## Phase 8: Verification Gate

- [x] 8.1 Run `pnpm --filter @trustai/web test` — full suite green, including `dictionaries.test.ts`, `HashOnlyCard.test.tsx`, `ClientHashRecompute.test.tsx`, `not-found.test.tsx`, `page.test.tsx`, and unmodified `VerificationDemo.test.tsx` (confirms shared `verdicts.*`/no `recompute.caveat` cross-read breakage).
- [x] 8.2 Run `pnpm --filter @trustai/web lint` and `pnpm --filter @trustai/web typecheck` — zero errors.
- [x] 8.3 Run `pnpm --filter @trustai/web build` — succeeds.
- [x] 8.4 Manual honesty review: confirm INV-41 untouched (no `analysis` field on `VerifyHashResponse`); confirm `recompute.caveat` still asserts only independent file-hash computation, never on-chain reconstruction; confirm `legal.disclaimer` makes no authorship/ownership claim; confirm `page.badge` names Base Sepolia (drops the literal word "testnet"/"(testnet)" per apply-time copy direction), never implies mainnet/production.
- [x] 8.5 Run `git diff --stat` and confirm zero changes under `apps/api/**`.
