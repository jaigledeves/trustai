# Delta for Web Certify Flow

## MODIFIED Requirements

### Requirement: Five-Step Progress Indicator

The wizard MUST render a 5-step indicator (upload, analysis, review,
anchor, certified) mapped from `TrustRecordState` (`DRAFT`, `READY`,
`ANCHORING`, `CERTIFIED`, `FAILED`, `DISCARDED`) plus
`aiSummary`/`analysisFailureReason`. No new state machine or backend
field is introduced. Completed, current, and upcoming steps MUST be
visually distinguishable. Labels MUST come from `certifyDictionary.stepper`
(`apps/web/dictionaries/es/certify.ts`). `certifyDictionary.stepper.anchorLabel`
MUST use the single canonical on-chain verb mandated by `web-plain-language`
("anclar"/"anclaje"), matching the verb used by `certifyDictionary.anchor.*`
status messages, so terminology stays consistent across the flow. The term
is made comprehensible to non-technical users through the plain-language
framing and quick-help affordance mandated by `web-plain-language` (ADR-010),
not by substituting a different word per surface.
(Previously: did not require cross-consistency between `stepper.anchorLabel`
and `anchor.*` status message wording; an earlier draft illustratively
preferred "Registro" over "Anclaje" — superseded by ADR-010, which locks
"anclar" as the sole on-chain verb.)

#### Scenario: Analysis complete, awaiting review shows step 3 active

- GIVEN `DRAFT` with `aiSummary` set, no `analysisFailureReason`
- WHEN the wizard renders
- THEN steps 1–2 are complete, step 3 (review) is current

#### Scenario: Confirmed record shows step 4 active

- GIVEN `READY`
- WHEN the wizard renders
- THEN steps 1–3 are complete, step 4 (anchor) is current, labeled from
  `certifyDictionary.stepper.anchorLabel` (canonical on-chain verb, "Anclaje")

#### Scenario: Anchoring shows step 4 in progress

- GIVEN `ANCHORING`
- WHEN the wizard renders
- THEN step 4 shows in-progress, not complete

#### Scenario: Certified shows all steps complete

- GIVEN `CERTIFIED`
- WHEN the wizard renders
- THEN all 5 steps show complete

#### Scenario: Stepper label and anchor status messages share one verb

- GIVEN `certifyDictionary.stepper.anchorLabel` and every
  `certifyDictionary.anchor.*Message` string
- WHEN each is inspected for its on-chain-action verb lemma
- THEN they all match the same verb lemma

### Requirement: Frozen-Hash Disclosure

Once `confirm` sets `canonicalHash`, the wizard MUST render a plain-
language field label (`certifyDictionary.confirm.frozenHashLabel`) above
the hash value — never the literal string "Hash canónico (evidencia
congelada)" — and this label MUST use the "huella" fingerprint noun
mandated by `web-plain-language`. Beside the label, the wizard MUST offer
an optional, native `<details>/<summary>` disclosure (no client JS) whose
trigger text comes from `certifyDictionary.confirm.frozenHashDisclosureLabel`
and whose body comes from `certifyDictionary.confirm.frozenHashDisclosure`,
preserving the "frozen evidence" technical nuance for users who want it
without forcing it on everyone.
(Previously: did not require the label to use the specific "huella" noun.)

#### Scenario: Frozen hash label is plain language and uses "huella"

- GIVEN `canonicalHash` is set (READY, ANCHORING, or CERTIFIED)
- WHEN the wizard renders
- THEN `certifyDictionary.confirm.frozenHashLabel` renders above the hash
  value, uses the "huella" noun, and the literal string "Hash canónico
  (evidencia congelada)" never renders

#### Scenario: Disclosure reveals the technical explanation on demand

- GIVEN `canonicalHash` is set
- WHEN the user activates the `frozenHashDisclosureLabel` trigger
- THEN `certifyDictionary.confirm.frozenHashDisclosure` becomes visible

## ADDED Requirements

### Requirement: Consistent On-Chain Verb Across Anchor Status Messages

Every `certifyDictionary.anchor.*` string that describes the on-chain
ACTION or an in-progress/error state — `anchoringMessage`,
`.retryingMessage`, `.slowMessage`, and `.errorGeneric` — MUST use the
single canonical on-chain verb mandated by `web-plain-language`
("anclar"/"anclaje"). No `anchor.*` string MUST introduce a second synonym
verb (e.g. the "registrar" family) for the same on-chain action within the
certify flow. The completion/success message (`.certifiedMessage`) MAY
describe the finished result in outcome language ("¡Documento
certificado!") without repeating the "anclar" verb, since it reports a
state rather than the action — but it too MUST NOT reintroduce a synonym
on-chain verb.

#### Scenario: All in-progress/error anchor messages share one verb

- GIVEN `certifyDictionary.anchor.anchoringMessage`, `.retryingMessage`,
  `.slowMessage`, and `.errorGeneric`
- WHEN each is inspected for its on-chain-action verb lemma
- THEN all four use the identical "anclar" verb lemma

#### Scenario: Success message stays outcome-oriented without a synonym verb

- GIVEN `certifyDictionary.anchor.certifiedMessage`
- WHEN it is inspected
- THEN it MAY omit the "anclar" verb (it describes the certified result),
  and it MUST NOT contain a "registrar"-family synonym for anchoring
