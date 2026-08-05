# Proposal: Refocus Landing Marketing Copy

## Intent

Landing prose leads with crypto jargon (blockchain, hash, SHA-256,
AES-256-GCM) and frames the testnet pilot as unfinished, burying the real
value prop: independent, third-party verifiability. Refocus copy toward
the trust promise and reframe the badge as a strength, preserving every
accuracy/honesty lock in `public-landing`.

## Scope

**Package**: `web` only. Copy-only: no new components/composition/client
JS/deps; no `api`/`dtr-core`/`smart-contracts`.

### In Scope
1. **Hero rewrite** — headline "Nadie tiene que creerte. Pueden
   comprobarlo." + subheadline; fold pain in as an eyebrow line (today,
   proof depends on trusting your word); drop "blockchain"/"hash"/
   "SHA-256" from prose. `hero.card` untouched (visual proof).
2. **HowItWorks disclosure** — move AES-256-GCM (step 1) and SHA-256 +
   RFC 8785 canonical serialization (step 3) out of `steps[*].description`
   into one `how.technicalDetail`, via native `<details>/<summary>`
   (`Faq.tsx` pattern). Accuracy preserved verbatim, only relocated.
3. **CTA micro-copy** — "Gratis · Sin tarjeta · Sin instalar nada," verified
   against real `/register`; no "2 minutos" claim (email-verification
   gate, stub notifier).
4. **Badge reframe** — reword `hero.badge` so the testnet fact reads as a
   strength (validated on-chain, no network cost), echoing `faq.items`.

### Out of Scope
New `Problem.tsx`/composition change (folded into hero); `VerificationDemo`,
theming, `Config-Driven Navigation`, `api`/`dtr-core`/contracts.

## Capabilities

New: none. Modified: `public-landing` (two requirements relaxed, no new
capability).

## Spec Impact

| Requirement | Disposition | Reason |
|---|---|---|
| Accurate Anchoring Copy | **MODIFY** | Pins SHA-256/canonical detail to `steps[2].description`; allow `technicalDetail` instead, verbatim. |
| Content-Audit Accuracy | **MODIFY** | Pins AES-256-GCM to `steps[0].description`; same relaxation. |
| Terminology Lock / Composition / RNF-041 / Test Coverage | No change | Untouched; no reorder; no new top-level group; prose generic. |

## Affected Areas (strict_tdd: #6/#7 RED before landing.ts GREEN)

| Area | Change |
|---|---|
| `dictionaries/es/landing.ts` | Hero prose, badge, CTA micro-copy, new `how.technicalDetail`; strip jargon from `steps[0]/[2]`. |
| `dictionaries/es/dictionaries.test.ts` | #6/#7 repointed to `/AES-256-GCM/`, `/canónic/i`, `/SHA-256/` on `technicalDetail`. |
| `components/landing/HowItWorks.tsx` | `<details>/<summary>` disclosure (`Faq.tsx` pattern), stays Server Component. |
| `components/landing/Hero.tsx` | Render new keys; `hero.card` JSX untouched. |
| `openspec/specs/public-landing/spec.md` | Delta per Spec Impact. |

## Risks

| Risk | Mitigation |
|---|---|
| Disclosure/CTA drift from fact | Reuse exact audit-validated wording; no immediacy claim. |
| Reframe read as scope creep | No new component/file/dep, zero composition change. |

## Rollback Plan

Single-purpose commit(s) touching only the 4 files + spec delta — plain
`git revert`. No migrations/schema/infra/contracts. **Dependencies**: none.

## Success Criteria

- [ ] Hero prose drops "blockchain"/"hash"/"SHA-256"; `hero.card` unchanged.
- [ ] `steps[0]/[2].description` drop AES-256-GCM/SHA-256/canonical; `technicalDetail` states both accurately.
- [ ] CTA micro-copy matches real `/register` flow; `hero.badge` reads as a strength.
- [ ] `pnpm --filter @trustai/web test` passes; only the two flagged `public-landing` requirements carry MODIFY deltas.
