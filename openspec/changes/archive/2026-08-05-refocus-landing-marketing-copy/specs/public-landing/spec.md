# Delta for Public Landing

## MODIFIED Requirements

### Requirement: Accurate Anchoring Copy

Any "what is anchored" claim (hero card, HowItWorks, FAQ) MUST state that
the SHA-256 hash of the DTR's RFC 8785 canonical serialization is anchored
on-chain. Copy MUST NOT state or imply that "the file's hash" is anchored.
The claim MAY live within `landingDictionary.how.technicalDetail` (a
structured technical-detail block — e.g. an `intro` string plus
`items: { term, desc }[]` — rather than a single string) instead of
`landingDictionary.how.steps[2].description`; wherever it lives, the
accuracy invariant below MUST hold.
(Previously: pinned the canonical-serialization claim exclusively to
`how.steps[2].description`.)

#### Scenario: HowItWorks states canonical-serialization hash accurately

- GIVEN `landingDictionary.how.technicalDetail` and
  `landingDictionary.how.steps[2].description`
- WHEN whichever of the two carries the anchoring claim is rendered
- THEN it describes anchoring the SHA-256 hash of the DTR's canonical
  (RFC 8785) serialization, not the raw file's hash

#### Scenario: No "file hash is anchored" claim anywhere

- GIVEN all anchoring-related copy (hero, how groups including
  `how.technicalDetail`, faq groups)
- WHEN scanned for "the file's hash is anchored" or equivalent phrasing
- THEN no such claim is present

### Requirement: Content-Audit Accuracy

`useCases` items MUST assert only integrity and timestamp claims
("existed unmodified since timestamp X") and MUST NOT assert authorship,
ownership, or issuer legitimacy. `faq` items MUST NOT promise pricing or
future paid plans. HowItWorks copy MUST state storage is encrypted with
AES-256-GCM (matches `apps/api/src/adapters/crypto/aes-gcm.adapter.ts`);
this statement MAY live within `landingDictionary.how.technicalDetail`
(a structured technical-detail block, not necessarily a single string)
instead of `landingDictionary.how.steps[0].description`.
(Previously: pinned the AES-256-GCM statement exclusively to
`how.steps[0].description`.)

#### Scenario: Use-case copy avoids authorship/ownership claims

- GIVEN each `landingDictionary.useCases.items` description
- WHEN inspected
- THEN it claims only unmodified-since-timestamp integrity, never who
  authored, owns, or legitimately issued the content

#### Scenario: FAQ has no pricing promise

- GIVEN all `landingDictionary.faq.items`
- WHEN scanned for pricing/roadmap language
- THEN no item promises future paid plans or pricing commitments

#### Scenario: HowItWorks names the real encryption algorithm

- GIVEN `landingDictionary.how.technicalDetail` and
  `landingDictionary.how.steps[0].description`
- WHEN whichever of the two carries the encryption claim is rendered
- THEN it states storage is encrypted with exactly AES-256-GCM
