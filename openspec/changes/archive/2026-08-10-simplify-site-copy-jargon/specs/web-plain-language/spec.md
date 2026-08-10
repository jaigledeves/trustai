# Web Plain-Language Specification

## Purpose

Owns the cross-cutting, site-wide contract that keeps TrustAI's core
concepts (the file fingerprint, the on-chain action, and the certified
record) named consistently and explained in plain language, so a
non-technical visitor can follow the hero and primary flows (landing,
certify, verify, auth, dtr list) with zero interaction, while a single
reusable, accessible affordance carries deeper explanation for supporting
sections.

## Non-Goals

- Crypto/anchoring behavior, smart-contract logic, or backend DTO shapes.
- Adding an `en/` locale.
- Content already correctly hidden behind an existing disclosure (e.g.
  `certifyDictionary.confirm.frozenHashDisclosure`,
  `verifyDictionary.recompute.caveat`).

## Requirements

### Requirement: One Fingerprint Term Site-Wide

Every dictionary module that names the SHA-256 fingerprint concept
(`landingDictionary`, `certifyDictionary`, `historyDictionary`,
`verifyDictionary`, `authDictionary`) MUST use the same Spanish noun
("huella") for that concept in every hero/primary-flow and
supporting-section string; no dictionary MUST use "hash" as the
user-facing noun for this concept outside a disclosure body reserved for
technical detail (e.g. `certifyDictionary.confirm.frozenHashDisclosure`,
`landingDictionary.how.technicalDetail`).

#### Scenario: Fingerprint labels use the same noun across dictionaries

- GIVEN `landingDictionary.hero.card.hashLabel`,
  `certifyDictionary.confirm.frozenHashLabel`,
  `historyDictionary.detail.canonicalHashLabel`, and any equivalent
  fingerprint label in `verifyDictionary`
- WHEN each label string is inspected
- THEN all of them use the same Spanish noun for the fingerprint concept

#### Scenario: Bare "hash" is confined to technical disclosures

- GIVEN every hero/primary-flow and non-disclosure supporting string
  across `landingDictionary`, `certifyDictionary`, `historyDictionary`,
  `verifyDictionary`
- WHEN scanned for the literal word "hash"
- THEN it appears only inside strings reserved for an opt-in technical
  disclosure, never in a label or sentence a user reads by default

### Requirement: One Canonical On-Chain Verb Site-Wide

The system MUST use exactly one Spanish verb to describe the act of
writing the fingerprint on-chain, consistently across
`landingDictionary`, `certifyDictionary`, `historyDictionary`, and
`verifyDictionary`. Design MUST select and record this verb (referencing
the dictionary keys below, never introducing a second synonym as the
primary label); `dictionaries.test.ts` MUST assert the chosen verb's
lemma is the only one used across `certifyDictionary.stepper.anchorLabel`,
`certifyDictionary.anchor.*Message`, `historyDictionary.states.ANCHORING`,
`historyDictionary.detail.anchorNotAnchored`,
`verifyDictionary.landing.anchorNotAnchoredLabel`, and
`verifyDictionary.verdicts.PENDING_ANCHOR.message`.

#### Scenario: Certify wizard uses one verb across its own states

- GIVEN `certifyDictionary.stepper.anchorLabel`,
  `certifyDictionary.anchor.anchoringMessage`,
  `certifyDictionary.anchor.retryingMessage`,
  `certifyDictionary.anchor.slowMessage`, and
  `certifyDictionary.anchor.errorGeneric`
- WHEN each string is inspected for its on-chain-action verb
- THEN they all use the same verb lemma; none introduces a second
  synonym for the same action

#### Scenario: "Not yet on-chain" state matches between dtr-list and verify

- GIVEN `historyDictionary.detail.anchorNotAnchored` and
  `verifyDictionary.landing.anchorNotAnchoredLabel`
- WHEN both strings are compared for their on-chain-action verb
- THEN they use the identical verb lemma to describe the same
  not-yet-on-chain state

### Requirement: One Canonical DTR Name With Expand-on-First-Use

Every dictionary module MUST refer to the certified record using exactly
one canonical Spanish name ("Registro Digital de Confianza"), expanded
with the "(DTR)" acronym on its first mention within a given page/flow,
and MUST NOT use the English form "Digital Trust Records" anywhere.
`dictionaries.test.ts` MUST assert the English form never appears in any
dictionary module.

#### Scenario: No dictionary contains the English DTR name

- GIVEN every dictionary module under `apps/web/dictionaries/es/`
- WHEN scanned for the literal substring "Digital Trust Records"
- THEN it is absent from all of them

#### Scenario: Each flow expands DTR on first mention

- GIVEN a page's dictionary group that introduces the acronym "DTR"
  (e.g. `authDictionary.login.subtitle`, `historyDictionary.list.title`)
- WHEN the first DTR reference within that group is inspected
- THEN it is paired with the full "Registro Digital de Confianza" name,
  not a bare "DTR"

### Requirement: Reusable Accessible Quick-Help Affordance

The system MUST provide one reusable quick-help/glossary component (web)
that supporting sections use to pair a jargon term with a plain-language
explanation. It MUST be operable via keyboard (focusable, activates on
Enter/Space, dismissible via Escape) and via touch/tap — it MUST NOT
depend on `:hover` alone to reveal its content. It MUST expose an
accessible name for its trigger and MUST be dismissible without leaving
the page. Hero and primary-flow copy MUST NOT require activating this
affordance to be understood.

#### Scenario: Quick-help opens via keyboard

- GIVEN a quick-help trigger has focus
- WHEN the user presses Enter or Space
- THEN its explanation content becomes visible and is reachable by
  assistive technology

#### Scenario: Quick-help opens via tap, no hover required

- GIVEN a quick-help trigger on a touch device with no hover capability
- WHEN the user taps the trigger
- THEN its explanation content becomes visible

#### Scenario: Quick-help is dismissible

- GIVEN an open quick-help explanation
- WHEN the user presses Escape or activates the trigger again
- THEN the explanation closes and focus returns to the trigger

#### Scenario: Hero copy needs no interaction to be understood

- GIVEN a first-time visitor who never activates any quick-help trigger
- WHEN they read only the hero/primary-flow copy of landing, certify,
  verify, auth, or the dtr list
- THEN that copy alone is plain language, requiring no glossary lookup

### Requirement: Plain-Language Framing for Unavoidable Terms

Where a technical term is unavoidable in a supporting section (e.g.
"blockchain", a network name), the surrounding copy MUST pair it with a
plain-language framing in the same sentence or an adjacent quick-help
explanation, rather than leaving the bare term unexplained.

#### Scenario: A supporting-section blockchain mention is framed in plain language

- GIVEN a supporting-section string that names "blockchain" or a network
- WHEN the surrounding sentence or its paired quick-help content is
  inspected
- THEN a plain-language framing of what that means for the user is
  present in the same sentence or the paired explanation
