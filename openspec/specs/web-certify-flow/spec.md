# web-certify-flow

Scope: the certify wizard (`/dtrs/[id]`) — step progress, document
context, and navigation across DRAFT → READY → ANCHORING →
CERTIFIED/DISCARDED/FAILED. Spans `apps/web` UI and `apps/api` DTO
fields it depends on.

## Purpose

The wizard MUST orient the user: current phase, document identity, and
an exit from terminal states.

## Requirements

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

### Requirement: Inline Failure State, Not a Phantom Step

When AI analysis fails (`analysisFailureReason` set on a `DRAFT` record)
or anchoring fails (`FAILED` state), the wizard MUST render the failure
inline within the step that owns that phase. The indicator MUST NOT grow
beyond 5 steps or introduce a separate "error" step. Copy MUST come from
`certifyDictionary.review.analysisFailedTitle` (analysis) or
`certifyDictionary.anchor.errorGeneric` (anchor). The analysis failure
body text MUST be a localized, dictionary-sourced Spanish message —
resolved by mapping `analysisFailureReason` through a pure lookup function
(`certifyDictionary.analysisError.{noTextLayer,noContent,generic}`) —
never the raw, untranslated string sourced from the backend job's
`output.message` (RNF-041: no bypassing the dictionary layer, even for
data-driven strings).

#### Scenario: Analysis failure renders inline on step 2

- GIVEN `DRAFT` with `analysisFailureReason` set
- WHEN the wizard renders
- THEN step 2 shows an error state; the indicator still shows 5 steps

#### Scenario: Anchor failure renders inline on step 4

- GIVEN `FAILED` state
- WHEN the wizard renders
- THEN step 4 shows an error state; the indicator still shows 5 steps

#### Scenario: Known text-extraction failure renders a localized message

- GIVEN `DRAFT` with `analysisFailureReason` containing
  `"no extractable text layer"` (the literal `NoTextLayerError` string)
- WHEN the failure banner renders
- THEN it shows `certifyDictionary.analysisError.noTextLayer`, never the
  raw English string

#### Scenario: Known empty-AI-response failure renders a localized message

- GIVEN `DRAFT` with `analysisFailureReason` containing
  `"returned no content"`
- WHEN the failure banner renders
- THEN it shows `certifyDictionary.analysisError.noContent`

#### Scenario: Unknown/dynamic failure reason falls back to a generic message

- GIVEN `DRAFT` with `analysisFailureReason` set to any string that does
  not match a known literal failure (e.g. a dynamic Zod-issue message or a
  defensive not-found error)
- WHEN the failure banner renders
- THEN it shows `certifyDictionary.analysisError.generic`, never the raw
  string

#### Scenario: Missing failure reason still falls back to a generic message

- GIVEN `DRAFT` with `analysisFailureReason` set to `null`/`undefined`
- WHEN the failure-reason lookup runs
- THEN it resolves to `certifyDictionary.analysisError.generic`

### Requirement: Persistent Document Context

`GET /trust-records/:id` MUST expose the asset's `filename`,
`sizeBytes`, and `createdAt` alongside existing `TrustRecordDetail`
fields. The wizard MUST render filename, size, and upload date above the
step indicator in every phase (analysis, review, anchor, certified,
discarded, error). When `filename` is `null` (legacy asset), a fallback
MUST render from `certifyDictionary.documentContext.filenameFallback`
instead of an empty slot. Labels come from `certifyDictionary.documentContext`.

#### Scenario: Document context renders in every phase

- GIVEN an asset with `filename`, `sizeBytes`, `createdAt`
- WHEN the wizard renders in any phase (analysis, review, anchor,
  certified, discarded, error)
- THEN filename, formatted size, and upload date render above the
  step indicator

#### Scenario: Missing filename shows a fallback label

- GIVEN an asset with `filename` set to `null`
- WHEN the document context renders
- THEN `certifyDictionary.documentContext.filenameFallback` renders
  instead of an empty slot

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

### Requirement: Persistent Back Navigation

A back affordance to `/dtrs` MUST be visible in every wizard phase,
including `ANCHORING`. Its label MUST come from
`certifyDictionary.navigation.backToList`.

#### Scenario: Back navigation is available while anchoring

- GIVEN `ANCHORING`
- WHEN the wizard renders
- THEN a usable link to `/dtrs` with the dictionary label is present

### Requirement: Terminal-State Exit CTAs

The `CERTIFIED` panel MUST offer a primary "view detail" action and a
secondary "back to `/dtrs`" action, labeled from
`certifyDictionary.anchor.viewDetailAction`/`.backToListAction`. The
`DISCARDED` state MUST offer "certify another" (→ `/dtrs/new`) and "back
to `/dtrs`" actions, labeled from
`certifyDictionary.discard.certifyAnotherAction`/`.backToListAction`.
Neither terminal state renders with zero exit actions.

#### Scenario: Certified panel offers detail and list exit actions

- GIVEN `CERTIFIED`
- WHEN the success panel renders
- THEN a primary "view detail" action and a secondary "back to `/dtrs`"
  action are both present

#### Scenario: Discarded state offers recovery actions

- GIVEN `DISCARDED`
- WHEN the wizard renders
- THEN a "certify another" action (→ `/dtrs/new`) and a "back to `/dtrs`"
  action are both present
