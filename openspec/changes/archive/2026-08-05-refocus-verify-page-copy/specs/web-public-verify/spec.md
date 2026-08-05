# Delta for web-public-verify

No canonical spec exists; locks the shipped baseline plus new
requirements (Option W).

## ADDED Requirements

### Requirement: Public No-Auth Verification Page

`/verify/[id]` MUST be a Server Component, no login/auth affordance.
`HashOnlyCard` MUST fetch `GET /public/verify/:id` server-side, no-store,
gated by `config.publicVerificationEnabled` (else `disabledMessage`).
Only `UploadVerdictPanel.tsx`/`ClientHashRecompute.tsx` MUST declare
`'use client'`; `page.tsx`, `layout.tsx`, `HashOnlyCard.tsx` MUST NOT.

#### Scenario: No-auth render, flag-gated, only two client islands

- GIVEN a no-session visitor requests `/verify/[id]`
- WHEN the flag is true, it renders with no auth UI and only `UploadVerdictPanel`/`ClientHashRecompute` carry `'use client'`
- AND WHEN false, only `disabledMessage` renders

### Requirement: Hash-Only GET & 404 Asymmetry (INV-41)

GET's `VerifyHashResponse` MUST NOT include AI `analysis`; it MUST
appear only after POST, for `VALID`/`PENDING_ANCHOR`. An unknown id MUST
404 on GET (`not-found.tsx`); POST MUST always return 200 with
`INVALID_RECORD` — upload MUST NOT 404.

#### Scenario: Analysis gated to matching POST verdicts; GET/POST 404 asymmetry

- GIVEN `HashOnlyCard` renders a GET result, no analysis field is present
- AND GIVEN a POST verdict is `VALID`/`PENDING_ANCHOR` with `result.analysis` set, `UploadVerdictPanel` renders `verifyDictionary.analysis.*`
- AND GIVEN an unknown id, GET renders `not-found.tsx` while POST returns 200 with `INVALID_RECORD`

### Requirement: Four Verdicts

The page MUST represent exactly `VALID`, `ASSET_MISMATCH`,
`PENDING_ANCHOR`, `INVALID_RECORD` from `verdicts.*`, colored `ok`
(VALID/PENDING_ANCHOR) or `destructive` (others).

#### Scenario: Each verdict renders its dictionary copy and color

- GIVEN a result for each of the 4 verdicts
- WHEN rendered
- THEN title/message match `verdicts.{VERDICT}`, color follows ok/destructive

### Requirement: Client-Side Hash Recompute Honesty

`ClientHashRecompute` MUST independently compute the file's SHA-256
in-browser via `@trustai/dtr-core`'s `sha256Hex`, never claiming to
reconstruct/verify the on-chain/canonical hash.

#### Scenario: Caveat preserves the honesty boundary

- GIVEN `verifyDictionary.recompute.caveat`
- WHEN scanned for hash-reconstruction claims
- THEN it asserts only independent file-hash computation, never canonical reconstruction

### Requirement: Web-Owned Verdict & Legal Copy (RNF-041 / Option W)

Verdict copy and the eIDAS disclaimer MUST resolve from
`verifyDictionary`, never the API. `HashOnlyCard` MUST NOT render
`result.explanation`/`result.disclaimer` (API MAY still return them;
unused for display).

#### Scenario: HashOnlyCard renders dictionary copy, not server strings

- GIVEN a GET response with `explanation`/`disclaimer` set
- WHEN `HashOnlyCard` renders
- THEN it shows `verifyDictionary` copy, never `result.explanation`/`result.disclaimer`

### Requirement: Plain-Language Verdict Copy (No Jargon)

Each `verdicts.*.message` MUST be one plain-language sentence, never
bare "DTR" or unexplained jargon, with no redundant third explanation
block beyond `title`/`message`.

#### Scenario: No bare jargon; shared keys stay non-empty

- GIVEN all four `verdicts.*.message`, none contain "DTR", "SHA-256", or "hash canónico"
- AND GIVEN `public-landing`'s `VerificationDemo` reads `verdicts.*`/`recompute.caveat`, every key stays a non-empty Spanish string

### Requirement: Corrected eIDAS Disclaimer (No Authorship Overclaim)

The disclaimer MUST state TrustAI provides no qualified electronic
signature ("firma electrónica cualificada") under eIDAS, certifying only
integrity and AI-processing provenance, never authorship/ownership.
Pending sign-off stays an internal comment (ADR-009).

#### Scenario: Disclaimer references eIDAS without authorship claim

- GIVEN the disclaimer text
- WHEN scanned
- THEN it references eIDAS/"firma electrónica cualificada", asserts no authorship/ownership

### Requirement: Honest Testnet Badge

`page.badge` MUST present Base Sepolia testnet/pilot truthfully,
framing anchoring as a strength, never implying mainnet/production.

#### Scenario: Badge stays accurate and non-apologetic

- GIVEN `page.badge`
- WHEN scanned
- THEN it names testnet honestly, never implies mainnet/production

### Requirement: Caveat in Secondary Disclosure

`recompute.caveat` MUST render inside a collapsed native
`<details>`/`<summary>` in `ClientHashRecompute`, not always-on text; no
new `'use client'` boundary.

#### Scenario: Caveat is collapsed by default and expandable

- GIVEN `ClientHashRecompute` mounts
- WHEN first rendered, caveat is hidden until `<summary>` toggled
- THEN toggling reveals `recompute.caveat`

### Requirement: Helpful Empty/Not-Found States

`not-found.tsx` MUST render link-specific copy from `verifyDictionary`
(not generic `shellDictionary.errors.notFound`) plus a link home.
`page.disabledMessage` MUST include a recovery pointer.

#### Scenario: Link-specific not-found and a recovery pointer

- GIVEN an unknown id triggers `notFound()`, `not-found.tsx` shows link-specific copy and a link to `/`
- AND GIVEN the flag is off, `disabledMessage` includes a recovery pointer, not a flat statement
