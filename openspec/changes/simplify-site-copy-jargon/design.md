# Design: Simplify Site Copy for Non-Technical Users

## Technical Approach

Dictionary-only content rewrite plus one new presentational primitive
(`QuickHelp`) and one new dictionary module (`glossary.ts`). No new state,
no client data flow changes. Two mechanisms carry all explanation:

1. **`QuickHelp`** — inline, term-level, for supporting-section jargon.
2. **Plain `<details>/<summary>`** — block-level, for a full disclosure
   body (frozen-hash rationale, technical detail, eIDAS full text). This
   pattern already exists (`certifyDictionary.confirm.frozenHashDisclosure`,
   `HowItWorks`'s `technicalDetail`) — reused, not replaced.

Hero/primary-flow strings never depend on either mechanism (two-tier model).

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | On-chain verb | **"anclar"/"anclaje"** everywhere an on-chain action/state is described | Locked. Fixes `certify.anchor.anchoringMessage` ("Registrando…" → "Anclando…"), `history.detail.anchorNotAnchored` ("fue registrado" → "fue anclado", matching `verify.landing.anchorNotAnchoredLabel`), `verify.landing.anchoredBadge`/`page.badge` ("Registrado" → "Anclado"). "Registro"/"registro" stays valid only as the **noun for the DTR artifact itself** ("Registro Digital de Confianza"), never as the verb for the on-chain write. |
| 2 | Stepper anchor label | `certifyDictionary.stepper.anchorLabel`: **"Registro" → "Anclaje"** | Spec's own added cross-consistency requirement ("MUST use the single canonical verb, matching `anchor.*Message`") supersedes its own stale illustrative parenthetical ("e.g. 'Registro', not 'Anclaje'"), which predates that sentence. "Anclaje" is not left bare: landing's "Cómo funciona" step 4 and FAQ already introduce the verb before a user reaches the wizard; the concurrent `anchor.anchoringMessage` plain-language sentence appears the moment the step goes active. **Genuine tradeoff — see ADR note below.** |
| 3 | Fingerprint noun | **"huella"**, qualified as "Huella del registro" (DTR canonical hash: landing card, certify confirm, history detail, verify landing) vs. "Huella del archivo" (verify's client-side recompute, which genuinely hashes the uploaded file, not the DTR) | "Huella del registro" already dominates (certify + history); aligns with the Accurate-Anchoring-Copy invariant (never imply "the file's hash" is what's anchored). The recompute exception is spec-sanctioned: that feature is explicitly about independent file hashing, never the canonical hash. |
| 4 | DTR name | **"Registro Digital de Confianza (DTR)"**, full expansion on first mention per page; bare "DTR" allowed after that (nav "Mis DTR", `stepper`/`navigation` labels) | Matches `web-plain-language` and `public-landing` requirements. Forbids `auth.login.subtitle`'s "Digital Trust Records". |
| 5 | Quick-help mechanism | Native `<details>`/`<summary>`, wrapped in a small client component for Escape-to-close | Repo already favors `<details>` (no popover/tooltip primitive; adding radix-popover is heavier). Native `<details>` gives focus + Enter/Space + tap for free, but **not** Escape-dismiss — a thin client wrapper (`ref` + `keydown` listener that clears the `open` attribute) is the minimum JS needed to satisfy the spec's explicit Escape requirement. No radix dependency added. |
| 6 | Glossary location | New `apps/web/dictionaries/es/glossary.ts` exporting `glossaryDictionary` | Single canonical source for term/definition pairs, reusable by any page's `QuickHelp` instances; included in `dictionaries.test.ts`'s non-empty-string sweep like every other dictionary. |
| 7 | eIDAS keys | `legal.disclaimerLabel` (unchanged heading), **`legal.disclaimerSummary`** (new, always visible), **`legal.disclaimerFullLabel`** (new, `<details>` trigger text), `legal.disclaimer` (unchanged key, now lives inside the `<details>` body instead of always-visible) | Matches spec's proposed `disclaimerSummary` key; mirrors the existing `frozenHashDisclosureLabel`/`frozenHashDisclosure` pattern for naming symmetry. |
| 8 | Testnet honesty on verify | New **`verifyDictionary.legal.networkNote`** — short, always-visible, non-badge line naming Base Sepolia/testnet/pilot status, placed near the legal section | Badge (`page.badge`) drops the network name per spec, but the page must not go silent about pilot/testnet status. Keeping it out of the hero badge (prominent) but in a supporting line (not gated behind a click) balances the two-tier model with the honesty invariant — it's a MUST-disclose fact, not optional reading. |

## Data Flow

    dictionary string (e.g. verify.ts)
            │
            ├─ hero/primary copy ──────────► rendered as-is, zero interaction
            │
            └─ supporting copy w/ jargon ──► <Term/> text + <QuickHelp
                                               term="…" definition={
                                               glossaryDictionary.X.definition}/>
                                                       │
                                             <details ref> (client wrapper)
                                                       │  Enter/Space/tap → open
                                                       │  Escape/re-toggle → close
                                             <summary aria-label>…</summary>
                                             <div>{definition}</div>

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/components/ui/quick-help.tsx` | Create | `QuickHelp` client component (native `<details>` + Escape handling) |
| `apps/web/components/ui/quick-help.test.tsx` | Create | Keyboard, tap, aria, Escape-dismiss tests |
| `apps/web/dictionaries/es/glossary.ts` | Create | `glossaryDictionary`: blockchain, huella, anclar, red de prueba/Base Sepolia |
| `apps/web/dictionaries/es/landing.ts` | Modify | Verb/noun unification, badge/card testnet removal, pillars/FAQ framing, `technicalDetail` accuracy (see spec) |
| `apps/web/dictionaries/es/certify.ts` | Modify | `stepper.anchorLabel` → "Anclaje"; `anchor.*Message` verb unification; `confirm.frozenHashLabel` → "Huella del registro" |
| `apps/web/dictionaries/es/history.ts` | Modify | `detail.canonicalHashLabel`/`anchorNotAnchored` verb+noun unification, `list.subtitle` DTR expansion |
| `apps/web/dictionaries/es/verify.ts` | Modify | `page.badge` drops network name; new `legal.disclaimerSummary`/`disclaimerFullLabel`/`networkNote`; `landing.anchoredBadge`/`anchorNotAnchoredLabel` verb fix; `recompute.title`/`hashLabel` huella-not-hash |
| `apps/web/dictionaries/es/auth.ts` | Modify | `login.subtitle` drops "Digital Trust Records", plain-language rewrite |
| `apps/web/dictionaries/es/dictionaries.test.ts` | Modify | Add glossary import + cross-dictionary verb/noun/DTR-name assertions |
| `apps/web/app/layout.tsx` | Modify | Replace hardcoded `metadata.description` with a dictionary-sourced string (RNF-041) |
| `apps/web/components/verify/EidasDisclaimer.tsx` (or existing verify legal component) | Modify | Render summary by default, full text behind `<details>` |
| `apps/web/components/landing/HowItWorks.tsx`, verify/certify/history components | Modify | Wire `QuickHelp` at jargon call sites; no structural change |

## Interfaces / Contracts

```ts
// apps/web/components/ui/quick-help.tsx
export interface QuickHelpProps {
  /** The jargon term being explained (used to build the default accessible name). */
  term: string;
  /** Plain-language definition, rendered in the disclosure body. */
  definition: string;
  /** Optional override for the trigger's accessible name. */
  label?: string;
  className?: string;
}

// apps/web/dictionaries/es/glossary.ts
export const glossaryDictionary = {
  blockchain: { term: "blockchain", definition: "…" },
  huella: { term: "huella", definition: "…" },
  anclar: { term: "anclar", definition: "…" },
  testnet: { term: "red de prueba", definition: "…" },
} as const;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (dictionaries) | Verb-lemma consistency (`ancl`) across `certify.anchor.*`, `stepper.anchorLabel`, `history.states.ANCHORING`, `history.detail.anchorNotAnchored`, `verify.landing.anchorNotAnchoredLabel`; no "Digital Trust Records"; no bare "Base Sepolia"/"testnet" in `verify.page.badge`/`landing.hero.badge`/`hero.card.*`; no visible "hash" outside disclosure keys; "Registro Digital de Confianza (DTR)" present verbatim | Extend `apps/web/dictionaries/es/dictionaries.test.ts` (existing home for cross-dictionary audits) |
| Component | `QuickHelp` opens on Enter/Space and tap, has accessible name, closes on Escape and re-toggle, focus returns to trigger | `apps/web/components/ui/quick-help.test.tsx`, Vitest + Testing Library |
| Component | eIDAS summary visible by default; full text only after activating the `<details>` trigger | Extend the verify legal component's existing test file |
| Manual/E2E (optional) | Hero/primary-flow copy of each page renders without any `QuickHelp` activated | Existing Playwright specs, no new suite required |

## Migration / Rollout

No migration required. Pure copy + one presentational component; git revert per proposal's rollback plan.

## Open Questions

- [ ] Confirm "Anclaje" as the stepper label (decision #2 above) with product/UX before apply — it reverses the spec's own illustrative example text.
- [ ] Exact wording of `glossaryDictionary` entries and all rewritten strings is deferred to apply-time, per instructions (not authored here).

## ADR Recommendation

**Yes, propose one ADR**: "Canonical on-chain verb: anclar over registrar, including the certify stepper label." This is a real, contestable tradeoff (breadcrumb simplicity vs. mandated cross-consistency) with a durable effect on all future certify/DTR copy — worth a permanent record per config.yaml's rule ("propose an ADR when a real tradeoff is made"). The native-`<details>`-vs-radix-popover choice is not ADR-worthy: it's a straightforward reuse of an existing, uncontested repo pattern.
