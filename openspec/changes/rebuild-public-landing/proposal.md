# Proposal: Rebuild Public Landing Page

**Package/domain**: `web` only. No `api`, `dtr-core`, `utils`, or `smart-contracts` changes.

## Intent

Today's `/` landing (`apps/web/app/page.tsx`) is generic and under-sells the product: static "how it works," no use-cases, no FAQ, no interactive proof. Port the approved v0 mock's design/copy into the real app to make the landing product/user-oriented, while fixing accuracy gaps the mock has relative to the actual backend (anchoring model, verdict semantics) and closing a pre-existing test-coverage gap on `page.tsx`.

## Scope

### In Scope
- New `apps/web/components/landing/` directory: `Hero`, `HowItWorks`, `VerificationDemo` (`'use client'`), `UseCases`, `Pillars`, `Faq`, `FinalCta`.
- Extend `apps/web/dictionaries/es/landing.ts` (RNF-041): `useCases`, `faq`, `verificationDemo` groups; correct anchoring/terminology copy in existing groups.
- Register `landingDictionary` in `dictionaries.test.ts` + exact-copy assertion for "Registro Digital de Confianza (DTR)".
- `VerificationDemo.test.tsx` + `app/page.test.tsx` (first-ever, closes existing gap).
- `--success*` → replaced with `emerald-*` Tailwind utilities (no `globals.css` change).

### Out of Scope
- Dark mode / `next-themes` / any `.dark`/`@media (prefers-color-scheme: dark)` addition.
- Backend, `apps/api`, or `packages/dtr-core` changes.
- New dependencies (`lucide-react` already present; mock's `@base-ui/react` button NOT ported).
- The mock project itself (`mockups/landing/...` stays untouched, reference-only).

## Capabilities

### New Capabilities
- `public-landing`: the marketing landing page at `/` — hero, how-it-works, honest verification demo, use-cases, pillars, FAQ, final CTA. First spec for this capability (none exists in `openspec/specs/`).

### Modified Capabilities
- None.

## Approach

Section-by-section port (exploration Approach 1): one component per section under `components/landing/`, `page.tsx` becomes a thin Server Component composition. Only `VerificationDemo` is `'use client'` — it toggles between the 4 real backend verdicts (`verifyDictionary.verdicts`), never claiming client-side on-chain comparison. Content-audit corrections (use-cases integrity-only, FAQ no pricing promise, step 1 "cifrado (AES-256-GCM)", anchoring = canonical-serialization hash) are applied during port, not after.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `apps/web/app/page.tsx` | Modified | Rebuilt as composition of new section components |
| `apps/web/components/landing/*` | New | 7 section components + colocated tests |
| `apps/web/dictionaries/es/landing.ts` | Modified | New groups + corrected copy |
| `apps/web/dictionaries/es/dictionaries.test.ts` | Modified | Register `landingDictionary`, add terminology lock |
| `apps/web/app/globals.css` | Unchanged | No new tokens — emerald utilities used instead |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock copy ported verbatim, reintroducing false anchoring/on-chain claims | Med | Content-audit constraints locked in proposal; spec phase writes Given/When/Then for exact copy |
| Terminology drift ("Digital Trust Record" vs DTR) | Med | Exact-copy test in `dictionaries.test.ts` |
| Client bundle creep beyond `VerificationDemo` | Low | FAQ uses native `<details>`, no other client islands |
| strict_tdd underestimated for new interactive + first-ever page test | Med | tasks phase to plan RED-GREEN-REFACTOR explicitly |

## Rollback Plan

Single `web`-only change, no schema/migration/contract impact. Revert is a plain `git revert` of the change's commit(s); `apps/web/app/page.tsx` and `landing.ts` return to their current committed state. No data migration, no feature flag needed — static marketing content only.

## Dependencies

None (no new packages; reuses existing `lucide-react`, `components/ui/button.tsx`, `verifyDictionary`).

## Success Criteria

- [ ] `/` renders all 8 sections (nav, hero, how-it-works, verification demo, use-cases, pillars, FAQ, final CTA, footer) with zero inline JSX copy.
- [ ] `pnpm --filter @trustai/web test` and `typecheck` pass, including new `VerificationDemo.test.tsx` and `app/page.test.tsx`.
- [ ] No dark-mode artifact ported; no new dependency added.
- [ ] "Registro Digital de Confianza (DTR)" is the only artifact terminology used across new/modified copy.
