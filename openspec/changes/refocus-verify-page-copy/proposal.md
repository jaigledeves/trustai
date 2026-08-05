# Proposal: Refocus Verify Page Copy

## Intent

`/verify/[id]` violates RNF-041 and undersells trust: `HashOnlyCard` shows
raw API English `explanation`/`disclaimer` under Spanish labels; the
disclaimer overclaims "authorship" (only integrity + AI provenance are
certified); the testnet badge reads unfinished; verdicts use bare jargon
("DTR"); the recompute caveat reads as a dead end; empty states are
generic. Refocus toward RF-045 (clear-language verdicts, no eIDAS
implication), preserving every honesty lock.

## Scope

**Package**: `web` only, copy/UI-only; `apps/api` untouched.

### In Scope
1. **Option W** — `verify.ts` becomes display source of truth;
   `HashOnlyCard.tsx` stops reading `result.explanation`/`.disclaimer`.
2. **Consolidation** — one plain-language `message` per verdict (folds
   recs 3+5: no bare "DTR", no jargon), not a third block. Keep 4 titles.
3. **Corrected eIDAS disclaimer** — Spanish, "firma electrónica
   cualificada" / eIDAS (Reglamento UE 910/2014), no authorship claim.
   Sign-off pending: internal-only (comment + ADR-009 gate).
4. **Badge reframe** — reword `page.badge`: testnet/pilot as a strength,
   matching the shipped landing hero badge.
5. **Caveat → disclosure** — `recompute.caveat` into a secondary
   `<details>` (`HowItWorks.tsx`/`Faq.tsx` pattern), collapsed; no
   on-chain/canonical hash reconstruction claim.
6. **Warmer empty states** — `not-found.tsx` link-specific copy, not
   generic `shellDictionary.errors.notFound`; `disabledMessage` gets a
   recovery pointer.

### Out of Scope
Rec 4 (downloadable doc); `apps/api` changes; 404 asymmetry; INV-41
shape; multi-locale.

## Capabilities

**New**: `web-public-verify` — no existing spec. `sdd-spec` MUST **ADD** a
baseline (hash-only card/INV-41, upload four states, no-auth,
hash-recompute honesty, 404 asymmetry) plus this change's requirements.

**Modified**: None formally — `public-landing`'s "Honest Verification
Demo" reads `verdicts[*]`/`.recompute.caveat` by reference; keys must
resolve to valid, non-empty Spanish strings.

`sdd-design` MUST record Option W as **ADR-009**: API string (unused by
web) coexists with web's Spanish source of truth.

## Affected Areas

| Area | Change |
|------|--------|
| `dictionaries/es/verify.ts` | Verdicts, disclaimer, badge, not-found/disabled copy |
| `HashOnlyCard.tsx` + test | Stop rendering server explanation/disclaimer |
| `ClientHashRecompute.tsx` + test | Caveat into `<details>` |
| `not-found.tsx` + test | Link-specific copy, key move |
| `dictionaries.test.ts` | Audit: no "DTR"/"autor" |
| `apps/api/**` | Untouched |

## Risks

| Risk | Mitigation |
|------|------------|
| API/web string drift | ADR-009 marks API string legacy-only |
| Reword breaks `VerificationDemo` | Shared read-through; landing tests must pass |

## Rollback Plan

Copy/UI-only, confined to `apps/web`. Single `git revert`; no `apps/api`
state to unwind.

## Success Criteria

- [ ] `HashOnlyCard` shows dictionary copy, never server `explanation`/`disclaimer`
- [ ] Disclaimer has no authorship claim; sign-off marker internal-only
- [ ] Badge reads as a strength, still honestly testnet
- [ ] No verdict `message` has "DTR"; caveat in collapsed `<details>`
- [ ] `not-found`/`disabledMessage` specific, with a recovery pointer
- [ ] `pnpm --filter @trustai/web test` passes; zero `apps/api` changes
