# Delta for web-public-verify

## MODIFIED Requirements

### Requirement: Four Verdicts

The page MUST represent exactly `VALID`, `ASSET_MISMATCH`, `PENDING_ANCHOR`,
`INVALID_RECORD` from `verdicts.*`, using three visual severities:
`success` for `VALID`, `pending` for `PENDING_ANCHOR`, and `error` for
`ASSET_MISMATCH`/`INVALID_RECORD`. `PENDING_ANCHOR` MUST NOT render with the
same color or icon as `VALID` — it communicates "in progress, not yet
proven," not a completed success. It MUST use a distinct pending/warning
treatment (amber, clock icon), never the green success color or the
success check icon.

(Previously: two-color split — `ok` for VALID/PENDING_ANCHOR rendered
identically green with a check icon, `destructive` for ASSET_MISMATCH/
INVALID_RECORD.)

#### Scenario: Each verdict renders its dictionary copy and severity

- GIVEN a result for each of the four verdicts
- WHEN rendered
- THEN title/message match `verdicts.{VERDICT}`
- AND severity follows success (VALID), pending (PENDING_ANCHOR), or error
  (ASSET_MISMATCH, INVALID_RECORD)

#### Scenario: PENDING_ANCHOR never reads as success

- GIVEN a POST result with verdict `PENDING_ANCHOR`
- WHEN `UploadVerdictPanel` renders the outcome
- THEN it does NOT use the success color token or the `Check` icon
- AND it uses the pending/warning color token and a `Clock` icon instead

#### Scenario: HashOnlyCard's PENDING_ANCHOR title never reads as success

- GIVEN a GET result with verdict `PENDING_ANCHOR`
- WHEN `HashOnlyCard` renders the verdict title
- THEN it does NOT use the success color token (`text-success`)
- AND it uses the pending/warning color token (`text-warning`) instead

## ADDED Requirements

### Requirement: Accessible Verdict Outcome Roles

The verdict outcome MUST expose an ARIA role matching its severity:
`role="alert"` for `error` severity (`ASSET_MISMATCH`, `INVALID_RECORD`),
`role="status"` for `success` (`VALID`) and `pending` (`PENDING_ANCHOR`)
severities. The pending outcome's accessible content MUST communicate an
in-progress, not-yet-proven state and MUST NOT imply the verdict already
succeeded.

#### Scenario: Error verdicts use role="alert"

- GIVEN a verdict of `ASSET_MISMATCH` or `INVALID_RECORD`
- WHEN the outcome renders
- THEN its container has `role="alert"`

#### Scenario: VALID and PENDING_ANCHOR use role="status"

- GIVEN a verdict of `VALID` or `PENDING_ANCHOR`
- WHEN the outcome renders
- THEN its container has `role="status"`

#### Scenario: Pending accessible content does not imply success

- GIVEN `PENDING_ANCHOR` renders with `role="status"`
- WHEN its accessible name/content is inspected
- THEN it communicates an in-progress, not-yet-proven state, not a
  completed/successful verification
