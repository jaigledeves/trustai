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
(`apps/web/dictionaries/es/certify.ts`).

#### Scenario: Analysis complete, awaiting review shows step 3 active

- GIVEN `DRAFT` with `aiSummary` set, no `analysisFailureReason`
- WHEN the wizard renders
- THEN steps 1–2 are complete, step 3 (review) is current

#### Scenario: Confirmed record shows step 4 active

- GIVEN `READY`
- WHEN the wizard renders
- THEN steps 1–3 are complete, step 4 (anchor) is current

#### Scenario: Anchoring shows step 4 in progress

- GIVEN `ANCHORING`
- WHEN the wizard renders
- THEN step 4 shows in-progress, not complete

#### Scenario: Certified shows all steps complete

- GIVEN `CERTIFIED`
- WHEN the wizard renders
- THEN all 5 steps show complete

### Requirement: Inline Failure State, Not a Phantom Step

When AI analysis fails (`analysisFailureReason` set on a `DRAFT` record)
or anchoring fails (`FAILED` state), the wizard MUST render the failure
inline within the step that owns that phase. The indicator MUST NOT grow
beyond 5 steps or introduce a separate "error" step. Copy MUST come from
`certifyDictionary.review.analysisFailedTitle` (analysis) or
`certifyDictionary.anchor.errorGeneric` (anchor).

#### Scenario: Analysis failure renders inline on step 2

- GIVEN `DRAFT` with `analysisFailureReason` set
- WHEN the wizard renders
- THEN step 2 shows an error state; the indicator still shows 5 steps

#### Scenario: Anchor failure renders inline on step 4

- GIVEN `FAILED` state
- WHEN the wizard renders
- THEN step 4 shows an error state; the indicator still shows 5 steps

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
