# Tasks: Simplify Site Copy for Non-Technical Users

<!--
NOTE: Final Spanish copy strings (dictionary values, glossary definitions)
are NOT authored here per design.md's Open Questions — they are pending
user/product review at the sdd-apply checkpoint. Tasks below name exact
keys/files/behaviors to implement; wording is drafted at apply and must
satisfy the cited spec scenario before a GREEN task is considered done.
Design decision #2 ("Anclaje" stepper label) is also explicitly flagged in
design.md as pending product/UX confirmation before apply.
-->

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450-650 (5 dictionary rewrites + new component/test + glossary + 2 component edits + ADR + 2 index files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | not specified by orchestrator; defaulting to ask-on-risk |
| Chain strategy | pending (user decision required) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | QuickHelp component + tests, glossary.ts, cross-dictionary RED assertions | PR 1 | Base: main (or tracker branch). No visible copy change yet — safe, small, reviewable foundation. |
| 2 | All 5 dictionary rewrites, eIDAS restructure, RNF-041 layout fix | PR 2 | Base: PR 1's branch (feature-branch-chain) or main (stacked). Bulk of the diff; each dictionary is one commit (see work-unit-commits). |
| 3 | QuickHelp wiring into components, ADR + index updates, full gate | PR 3 | Base: PR 2's branch or main. Depends on PR 1 (component) + PR 2 (final copy/keys). |

## Phase 1: QuickHelp Component — RED

- [x] 1.1 Create `apps/web/components/ui/quick-help.test.tsx`: trigger has an accessible name (default from `term`, override via `label`).
- [x] 1.2 Test: Enter/Space on focused trigger opens the definition content (Testing Library `userEvent`).
- [x] 1.3 Test: tap/click opens content without any `:hover` simulation.
- [x] 1.4 Test: Escape while open closes content and returns focus to the trigger.
- [x] 1.5 Test: re-activating the open trigger toggles it closed.
- [x] 1.6 Run `pnpm --filter @trustai/web test -- quick-help` — confirm all fail (module doesn't exist yet).

## Phase 2: QuickHelp Component — GREEN

- [x] 2.1 Create `apps/web/components/ui/quick-help.tsx`: `"use client"`, native `<details>/<summary>`, props `{ term, definition, label?, className? }` per design.md's interface.
- [x] 2.2 Implement Escape-to-close via a `ref` + `keydown` listener that clears the `open` attribute (no radix dependency).
- [x] 2.3 Set `<summary>`'s accessible name from `label ?? term`; render `definition` in the disclosure body.
- [x] 2.4 Run `pnpm --filter @trustai/web test -- quick-help` — all Phase 1 tests pass.

## Phase 3: Glossary Dictionary Module

- [x] 3.1 RED: add `glossaryDictionary` import to `apps/web/dictionaries/es/dictionaries.test.ts`'s non-empty-string sweep (`it.each` array) — fails, module missing.
- [x] 3.2 GREEN: create `apps/web/dictionaries/es/glossary.ts` exporting `glossaryDictionary` with `blockchain`, `huella`, `anclar`, `redDePrueba` (`{ term, definition }` per design.md interface) in plain Spanish.
- [x] 3.3 Run the sweep test — passes.

## Phase 4: Cross-Dictionary Consistency Assertions — RED

- [x] 4.1 In `dictionaries.test.ts`, add a test asserting the verb lemma "ancl" is the only on-chain-action lemma across `certifyDictionary.stepper.anchorLabel`, `certifyDictionary.anchor.*Message`/`errorGeneric`, `historyDictionary.states.ANCHORING`, `historyDictionary.detail.anchorNotAnchored`, `verifyDictionary.landing.anchorNotAnchoredLabel`, `verifyDictionary.verdicts.PENDING_ANCHOR.message`.
- [x] 4.2 Add a test asserting no dictionary module contains the literal "Digital Trust Records" (scan all six dictionaries incl. `glossaryDictionary`).
- [x] 4.3 Update the existing `page.badge names Base Sepolia honestly...` test: invert to assert `verifyDictionary.page.badge` does NOT contain "Base Sepolia" or "testnet" (spec change: network naming moves to `legal.networkNote`).
- [x] 4.4 Add a test asserting `landingDictionary.hero.badge` and `hero.card.statusBadge`/`network`/`footerNote` do not contain "Base Sepolia"/"testnet".
- [x] 4.5 Add a test asserting "huella" (not "hash") is the fingerprint noun in `landingDictionary.hero.card.hashLabel`, `certifyDictionary.confirm.frozenHashLabel`, `historyDictionary.detail.canonicalHashLabel`, and `verifyDictionary.recompute.hashLabel`/`title`, outside disclosure keys.
- [x] 4.6 Run `pnpm --filter @trustai/web test -- dictionaries` — confirm the new/updated assertions fail against current copy.

## Phase 5: Landing Dictionary — GREEN

- [x] 5.1 `hero.badge`, `hero.card.statusBadge`/`network`/`footerNote`: drop "Base Sepolia"/"testnet", keep plain-language on-chain guarantee (spec: Testnet Naming Confined to FAQ).
- [x] 5.2 `hero.card.hashLabel`: use "huella" noun (already close — verify wording matches Phase 4.5 assertion).
- [x] 5.3 `how.steps[3]`/`how.technicalDetail`: state the SHA-256 of the DTR's canonical (RFC 8785) serialization is anchored, never "the file's hash" (spec: Accurate Anchoring Copy).
- [x] 5.4 `pillars.items[0]`/`items[1]`: rephrase to avoid unexplained "criptográfica"/raw verb/"hash" jargon (spec: Pillars Copy Uses Plain Language).
- [x] 5.5 `faq.items` blockchain-mentioning answers: pair the term with a plain-language framing in the same answer (spec: unavoidable-terms requirement); leave the Base Sepolia FAQ entry's network naming intact.
- [x] 5.6 Run `pnpm --filter @trustai/web test -- dictionaries` — landing-scoped assertions pass; re-run `landingDictionary copy audit` describe block for regressions.

## Phase 6: Auth Dictionary — GREEN

- [x] 6.1 `authDictionary.login.subtitle`: drop "Digital Trust Records", use "Registro Digital de Confianza (DTR)" if referencing the record, plain language (spec: web-auth-flow).
- [x] 6.2 `authDictionary.register.subtitle`: plain-language rewrite, no unexplained "blockchain".
- [x] 6.3 Run `pnpm --filter @trustai/web test -- dictionaries` — 4.2/4.1-scoped auth assertions pass.

## Phase 7: Certify Dictionary — GREEN

- [x] 7.1 `certifyDictionary.stepper.anchorLabel`: "Registro" → "Anclaje" (design decision #2 — confirm with product before apply).
- [x] 7.2 `certifyDictionary.anchor.anchoringMessage`/`.retryingMessage`/`.slowMessage`/`.certifiedMessage`/`.errorGeneric`: unify on the "anclar" verb lemma.
- [x] 7.3 `certifyDictionary.confirm.frozenHashLabel`: confirm "Huella del registro" wording (already aligned; verify against Phase 4.5).
- [x] 7.4 Run `pnpm --filter @trustai/web test -- dictionaries` and `CertifyWizard.test.tsx` — verb-lemma and stepper assertions pass, no regression on frozen-hash disclosure test.

## Phase 8: History Dictionary — GREEN

- [x] 8.1 `historyDictionary.detail.canonicalHashLabel`: confirm "huella" noun (Phase 4.5).
- [x] 8.2 `historyDictionary.detail.anchorNotAnchored`: "fue registrado" → "fue anclado", matching `verifyDictionary.landing.anchorNotAnchoredLabel`.
- [x] 8.3 `historyDictionary.list.subtitle`: plain-language rewrite, DTR full expansion, no unexplained "blockchain" (spec: web-dtr-list).
- [x] 8.4 Run `pnpm --filter @trustai/web test -- dictionaries` and `DtrTable.test.tsx`/`page.test.tsx` (dtrs list) — pass, no regression.

## Phase 9: Verify Dictionary — GREEN

- [x] 9.1 `page.badge`: drop "Base Sepolia"/testnet naming, describe public checkable verification in plain language.
- [x] 9.2 Add `legal.disclaimerSummary` (always-visible plain-language summary) and `legal.disclaimerFullLabel` (`<details>` trigger text) keys.
- [x] 9.3 Add `legal.networkNote`: short always-visible line honestly naming Base Sepolia/testnet/pilot status.
- [x] 9.4 `landing.anchoredBadge`: "Registrado en blockchain" → uses "anclar" verb lemma.
- [x] 9.5 `recompute.title`/`.hashLabel`: "Hash…" → "Huella…" wording (huella-not-hash outside the caveat's technical disclosure).
- [x] 9.6 Run `pnpm --filter @trustai/web test -- dictionaries` — all verify-scoped assertions (4.1, 4.3, 4.5) pass.

## Phase 10: eIDAS Disclosure Restructure — RED → GREEN

- [x] 10.1 RED: update `HashOnlyCard.test.tsx` — assert `legal.disclaimerSummary` is visible by default (no interaction) and `legal.disclaimer` is only visible after activating the `legal.disclaimerFullLabel` trigger.
- [x] 10.2 Run the test — confirm it fails against current always-visible-disclaimer markup.
- [x] 10.3 GREEN: edit `apps/web/components/verify/HashOnlyCard.tsx` — render `legal.disclaimerSummary` always visible; wrap `legal.disclaimer` body in a native `<details>` with `<summary>{legal.disclaimerFullLabel}</summary>`; render `legal.networkNote` nearby, always visible.
- [x] 10.4 Run `pnpm --filter @trustai/web test -- HashOnlyCard` — passes.

## Phase 11: RNF-041 Fix — layout.tsx metadata.description — RED → GREEN

- [x] 11.1 Add `shellDictionary.meta.description` key to `apps/web/dictionaries/es/shell.ts` (plain-language app description).
- [x] 11.2 RED: create `apps/web/app/layout.test.tsx` asserting the exported `metadata.description` equals `shellDictionary.meta.description`, not a literal string.
- [x] 11.3 Run the test — confirm it fails against the current hardcoded string.
- [x] 11.4 GREEN: edit `apps/web/app/layout.tsx` — import `shellDictionary`, set `metadata.description = shellDictionary.meta.description`.
- [x] 11.5 Run `pnpm --filter @trustai/web test -- layout` — passes.

## Phase 12: Wire QuickHelp Into Supporting-Section Jargon — RED → GREEN

- [x] 12.1 RED: add a QuickHelp-presence assertion to a new/updated test for each target — `HowItWorks.tsx` (blockchain/AnchorRegistry term inside `technicalDetail`), `HashOnlyCard.tsx` (testnet term near `legal.networkNote`), `CertifyWizard.test.tsx` (anclar term near the anchor status message), `DtrDetailCard.tsx` (anclar term near `anchorTitle`).
- [x] 12.2 Confirm each new assertion fails (component doesn't render `QuickHelp` yet).
- [x] 12.3 GREEN: wire `<QuickHelp term=... definition={glossaryDictionary.X.definition}/>` at each of the 4 call sites, no structural change otherwise.
- [x] 12.4 Run `pnpm --filter @trustai/web test` for the 4 touched components — passes.

## Phase 13: ADR

- [x] 13.1 Create `docs/adr/ADR-010-verbo-canonico-anclar-vs-registrar.md` following the ADR-009 format (Estado/Fecha/Decisores/Relacionadas, Contexto, Problema, Alternativas, Decisión, Consecuencias, Referencias) documenting the "anclar" vs. "registrar" tradeoff and the stepper-label reversal.
- [x] 13.2 Add the new row to `docs/architecture/decisions.md`'s ADR table.
- [x] 13.3 Add the corresponding row to `docs/README.md`'s ADR table.

## Phase 14: Full Gate

- [x] 14.1 `pnpm --filter @trustai/web test` — all unit/component tests pass.
- [x] 14.2 `pnpm --filter @trustai/web lint`.
- [x] 14.3 `pnpm --filter @trustai/web typecheck`.
- [x] 14.4 `pnpm --filter @trustai/web build`.
- [x] 14.5 `pnpm -r test` (workspace-wide, per `rules.apply.tdd`/`test_command`) — confirm no cross-package regression.
