# Proposal: Simplify Site Copy for Non-Technical Users

## Intent

A non-technical user (the founder's daughter) could not understand core
copy: "blockchain", "Base Sepolia"/testnet, "anclaje", "hash",
"criptográfica", and the eIDAS disclaimer are visible by default. The same
concepts are also named inconsistently (hash/huella, anclado/registrado,
DTR/"Digital Trust Records"), compounding confusion. Goal: make the site
understandable to a layperson site-wide, without touching crypto/anchoring
behavior.

## Scope

### In Scope
- Rewrite hero + primary-flow copy (landing, certify, verify, auth, dtr list)
  in plain language, zero-interaction.
- Unify terminology: one fingerprint word ("huella"), one on-chain verb, one
  canonical DTR name with expand-on-first-use.
- Add a reusable, accessible, tap-friendly "quick help" affordance for
  supporting sections.
- Rewrite the eIDAS disclaimer in plain language (verify page).
- Fix `apps/web/app/layout.tsx` metadata.description (RNF-041 violation).
- Dictionary-only changes: `apps/web/dictionaries/es/*.ts`.

### Out of Scope
- Backend/api, dtr-core, smart-contracts, or crypto/anchoring behavior.
- Adding an `en/` locale.
- Content already correctly hidden behind disclosures (AES-256-GCM,
  RFC 8785, bytes32, AnchorRegistry, on-chain internals).

## Capabilities

### New Capabilities
- `web-plain-language`: canonical terminology (huella, one on-chain verb,
  one DTR name) plus a reusable, accessible, tap-first quick-help/glossary
  affordance for supporting sections.

### Modified Capabilities
- `public-landing`: hero/badges/how-it-works/pillars/FAQ simplified; jargon
  routes through quick-help.
- `web-auth-flow`: login/register subtitles use plain language + canonical DTR name.
- `web-certify-flow`: stepper/status labels use the canonical on-chain verb.
- `web-dtr-list`: subtitle/labels use canonical huella/DTR naming.
- `web-public-verify`: badge, recompute caveat, and eIDAS disclaimer
  simplified; terms behind quick-help.

## Approach

Two-tier model: (1) hero/primary-flow copy MUST be plain with zero
interaction — no tooltip dependency, since mobile has no hover; (2)
supporting sections MAY pair terms with quick-help. `web-plain-language`
owns the glossary/affordance; page specs reference it.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `apps/web/dictionaries/es/*.ts` | Modified | Copy rewrites, terminology unification |
| `apps/web/app/layout.tsx` | Modified | Fix hardcoded metadata.description (RNF-041) |
| new quick-help component (web) | New | Accessible, tap-based glossary affordance |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Over-simplifying loses eIDAS precision | Med | Full legal text behind disclosure, summary visible |
| Unification breaks copy tests | Med | Update tests with dictionary edits |
| Affordance not mobile-accessible | Low | Tap-first design, a11y checks |

## Rollback Plan

Pure git revert of `feat/simplify-site-copy-jargon`: copy edits and one
presentational component, no data/schema/contract changes.

## Dependencies

None

## Success Criteria

- [ ] Hero/primary-flow copy is understandable without interaction, site-wide
- [ ] Fingerprint term, on-chain verb, and DTR name are consistent site-wide
- [ ] eIDAS disclaimer has a plain-language summary visible by default
- [ ] `layout.tsx` no longer hardcodes copy (RNF-041 compliant)
- [ ] Quick-help affordance is keyboard/tap accessible and tested
