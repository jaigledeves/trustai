# Delta for Web DTR List

## MODIFIED Requirements

### Requirement: DTR Acronym Explanation on the List Page

The `/dtrs` page MUST render a one-line subtitle below the `<h1>` heading
expanding what "DTR" means, reusing the established Spanish term already
used by the public landing/verify pages ("Registro Digital de Confianza
(DTR)"), so a first-time user landing on their own record list
immediately understands the acronym. The subtitle text MUST come from
`historyDictionary.list.subtitle` (`apps/web/dictionaries/es/history.ts`),
never an inline literal (RNF-041). The subtitle MUST be understandable by
a non-technical user without prior knowledge of "blockchain" as an
unexplained term, and MUST use the single canonical on-chain verb
mandated by `web-plain-language` if it references the on-chain step.
(Previously: did not require the subtitle to avoid unexplained
"blockchain" jargon or to use the canonical on-chain verb.)

#### Scenario: List page shows the DTR expansion subtitle

- GIVEN a user opens `/dtrs`
- WHEN the page renders
- THEN a subtitle rendering `historyDictionary.list.subtitle` appears
  below the `<h1>{historyDictionary.list.title}</h1>` heading, regardless
  of whether the list has records or is empty

#### Scenario: Subtitle avoids unexplained blockchain jargon

- GIVEN `historyDictionary.list.subtitle`
- WHEN read on its own by a first-time visitor
- THEN it conveys what a DTR is without requiring prior knowledge of
  "blockchain" as an unexplained term

## ADDED Requirements

### Requirement: Detail View Terminology Consistency

The `/dtrs/[id]` detail view's fingerprint label
(`historyDictionary.detail.canonicalHashLabel`) MUST use the "huella"
noun mandated by `web-plain-language`. Its on-chain section title
(`historyDictionary.detail.anchorTitle`) and not-yet-on-chain state
(`historyDictionary.detail.anchorNotAnchored`) MUST use the single
canonical on-chain verb mandated by `web-plain-language`, and that verb
MUST match the one used by the public verify page's equivalent
not-yet-on-chain state (`verifyDictionary.landing.anchorNotAnchoredLabel`),
resolving the existing "anclado"/"registrado" inconsistency between the
two pages.

#### Scenario: Fingerprint label uses "huella"

- GIVEN the `/dtrs/[id]` detail view
- WHEN it renders `historyDictionary.detail.canonicalHashLabel`
- THEN the label uses the "huella" noun

#### Scenario: Not-anchored state matches the verify page's wording

- GIVEN `historyDictionary.detail.anchorNotAnchored` and
  `verifyDictionary.landing.anchorNotAnchoredLabel`
- WHEN both strings are compared for their on-chain-action verb
- THEN they use the identical verb lemma, resolving the prior
  "anclado" vs. "registrado" mismatch

#### Scenario: `ANCHORING` state label uses the canonical verb

- GIVEN `historyDictionary.states.ANCHORING`
- WHEN compared against `certifyDictionary.stepper.anchorLabel`'s verb
  lemma
- THEN both use the same canonical on-chain verb
