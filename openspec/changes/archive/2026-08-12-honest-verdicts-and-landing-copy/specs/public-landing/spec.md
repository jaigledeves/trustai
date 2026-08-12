# Delta for public-landing

## MODIFIED Requirements

### Requirement: Honest Verification Demo

`VerificationDemo` MUST let a visitor toggle among the four real backend
verdicts, presented in semaphore order `VALID`, `PENDING_ANCHOR`,
`ASSET_MISMATCH`, `INVALID_RECORD`, sourcing verdict title/message copy
from `verifyDictionary.verdicts` (not re-authored). The rendered outcome
MUST use the same three-state severity as `web-public-verify`: `success`
for `VALID`, `pending` for `PENDING_ANCHOR`, `error` for `ASSET_MISMATCH`/
`INVALID_RECORD`. `PENDING_ANCHOR` MUST NOT render with the success color
or the success (check) icon — it MUST use a distinct pending/warning
treatment. It MUST NOT claim the browser recomputes a file hash and
compares it against the on-chain/canonical hash. It MAY state the browser
independently recomputes the file's SHA-256, with caveat wording consistent
with `verifyDictionary.recompute.caveat`. `landingDictionary.verificationDemo`
copy MUST use the same fingerprint term and on-chain verb mandated by
`web-plain-language`, matching `verifyDictionary`'s equivalent copy.

(Previously: verdict buttons ordered VALID, ASSET_MISMATCH, PENDING_ANCHOR,
INVALID_RECORD, with a binary success/error color split that rendered
PENDING_ANCHOR identically to VALID.)

#### Scenario: Buttons render in semaphore order

- GIVEN `VerificationDemo` is rendered
- WHEN the verdict toggle buttons are inspected in DOM order
- THEN they appear as VALID, PENDING_ANCHOR, ASSET_MISMATCH, INVALID_RECORD

#### Scenario: Toggling shows each real verdict's copy

- GIVEN `VerificationDemo` is rendered
- WHEN a visitor selects each of the four verdict options in turn
- THEN the displayed title/message match `verifyDictionary.verdicts.VALID`,
  `.PENDING_ANCHOR`, `.ASSET_MISMATCH`, `.INVALID_RECORD` respectively

#### Scenario: PENDING_ANCHOR never renders as success

- GIVEN a visitor selects the `PENDING_ANCHOR` verdict
- WHEN the outcome panel renders
- THEN it does not use the success color token or a check icon
- AND it uses the pending/warning color token instead

#### Scenario: No on-chain comparison claim

- GIVEN all `landingDictionary.verificationDemo` strings
- WHEN scanned for browser-side hash-comparison claims
- THEN none assert the browser recomputes a file hash and compares it
  against an on-chain or canonical hash value

#### Scenario: Optional recompute caveat matches verify.ts pattern

- GIVEN copy stating the browser recomputes the file's SHA-256
- WHEN compared against `verifyDictionary.recompute.caveat`
- THEN it preserves the same caveat (independent client hash only, no
  canonical/on-chain reconstruction)

#### Scenario: Verification demo terminology matches verify page

- GIVEN `landingDictionary.verificationDemo`'s fingerprint and
  on-chain-action wording
- WHEN compared against `verifyDictionary`'s equivalent wording
- THEN both use the same fingerprint noun and the same on-chain verb

## ADDED Requirements

### Requirement: Hero Value Props Are the Single Source of Free/No-Card Messaging

The hero section MUST communicate "free / no card / no install" claims in
exactly one place: the `valueProps` list (rendered with the success check
icon). The hero MUST NOT render a separate microcopy line duplicating the
same claims beneath the CTA buttons, and `landingDictionary.hero` MUST NOT
define an unused `ctaMicrocopy` key.

#### Scenario: Hero renders no duplicate free/no-card line

- GIVEN the Hero section is rendered
- WHEN its DOM is inspected below the CTA buttons
- THEN no standalone paragraph repeats the free/no-card/no-install claims
- AND the `valueProps` list remains the only place those claims appear

#### Scenario: ctaMicrocopy key is removed from the dictionary

- GIVEN `landingDictionary.hero`
- WHEN its keys are inspected
- THEN no `ctaMicrocopy` key is present
