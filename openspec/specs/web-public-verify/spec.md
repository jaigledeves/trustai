# web-public-verify

Baseline for the public, no-auth `/verify/[id]` verification page (hash-only
GET, POST verdicts, client hash recompute) plus the RNF-041 copy refocus
(Option W — `web` owns verdict and legal copy, not the API).

## Requirements

### Requirement: Public No-Auth Verification Page

`/verify/[id]` MUST be a Server Component. Viewing verification results
MUST NOT require login: no verification content, GET result, or POST
verdict is ever gated behind, or redirects to, authentication. The page
header MAY render a session-aware auth affordance (see "Unified Header
Auth Cluster on Verify" below) without this affordance gating any content.
`HashOnlyCard` MUST fetch `GET /public/verify/:id` server-side, no-store,
gated by `config.publicVerificationEnabled` (else `disabledMessage`).
Only `UploadVerdictPanel.tsx`/`ClientHashRecompute.tsx` MUST declare
`'use client'`; `page.tsx`, `layout.tsx`, `HashOnlyCard.tsx` MUST NOT.

#### Scenario: No-auth render, flag-gated, only two client islands

- GIVEN a no-session visitor requests `/verify/[id]`
- WHEN the flag is true, it renders with no forced login and only
  `UploadVerdictPanel`/`ClientHashRecompute` carry `'use client'`
- AND WHEN false, only `disabledMessage` renders

#### Scenario: Authenticated visitor's session never gates verification content

- GIVEN a logged-in visitor requests `/verify/[id]`
- WHEN the page renders
- THEN the GET result, POST verdict flow, and all verification content
  render identically to the logged-out case — the auth cluster in the
  header is the only difference

#### Scenario: Verification never redirects to login

- GIVEN any visitor, logged in or not, requests `/verify/[id]`
- WHEN the page resolves
- THEN no redirect to `/login` occurs under any auth state

### Requirement: Unified Header Auth Cluster on Verify

The `/verify/[id]` layout header MUST render the same session-aware auth
cluster used by the landing `Nav`. Logged out: section links (excluding
`verificacion`) plus `ThemeToggle` plus a single "Acceder"
(`shellDictionary.nav.signIn`) action linking to `/login`. Logged in:
"Mis DTR" (→ `/dtrs`) plus "Cerrar sesión", with `ThemeToggle` still
present; it MUST NOT render a "Certificar"/new-certification shortcut.

#### Scenario: Logged-out verify header shows section links, ThemeToggle, and Acceder

- GIVEN a no-session visitor requests `/verify/[id]`
- WHEN the header renders
- THEN it shows the section links, `ThemeToggle`, and a single "Acceder"
  action linking to `/login`

#### Scenario: Logged-in verify header shows Mis DTR and Cerrar sesión, not Certificar

- GIVEN an authenticated visitor requests `/verify/[id]`
- WHEN the header renders
- THEN it shows "Mis DTR" linking to `/dtrs` and "Cerrar sesión"
- AND it does NOT show a "Certificar"/new-certification shortcut

#### Scenario: ThemeToggle renders in both auth states

- GIVEN either a logged-out or a logged-in visitor requests `/verify/[id]`
- WHEN the header renders
- THEN `ThemeToggle` is present in both states

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

The page MUST represent exactly `VALID`, `ASSET_MISMATCH`, `PENDING_ANCHOR`,
`INVALID_RECORD` from `verdicts.*`, using three visual severities:
`success` for `VALID`, `pending` for `PENDING_ANCHOR`, and `error` for
`ASSET_MISMATCH`/`INVALID_RECORD`. `PENDING_ANCHOR` MUST NOT render with the
same color or icon as `VALID` — it communicates "in progress, not yet
proven," not a completed success. It MUST use a distinct pending/warning
treatment (amber, clock icon), never the green success color or the
success check icon.

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

### Requirement: Client-Side Hash Recompute Honesty

`ClientHashRecompute` MUST independently compute the file's SHA-256
in-browser via `@trustai/dtr-core`'s `sha256Hex`, never claiming to
reconstruct/verify the on-chain/canonical hash. `verifyDictionary.recompute.caveat`
MUST use the same fingerprint noun and canonical on-chain verb mandated
by `web-plain-language`, and MUST be the single source of truth that
`landingDictionary.verificationDemo.recompute.caveat` matches.

#### Scenario: Caveat preserves the honesty boundary

- GIVEN `verifyDictionary.recompute.caveat`
- WHEN scanned for hash-reconstruction claims
- THEN it asserts only independent file-hash computation, never canonical
  reconstruction

#### Scenario: Landing's caveat matches this canonical wording

- GIVEN `verifyDictionary.recompute.caveat` and
  `landingDictionary.verificationDemo.recompute.caveat`
- WHEN both are compared
- THEN they use the same fingerprint noun and the same on-chain verb

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

### Requirement: Corrected eIDAS Disclaimer (No Authorship Overclaim), Plain-Language Summary Visible by Default

The disclaimer MUST state TrustAI provides no qualified electronic
signature ("firma electrónica cualificada") under eIDAS, certifying only
integrity and AI-processing provenance, never authorship/ownership.
A plain-language summary of this disclaimer MUST be visible by default
(no interaction required), sourced from a dedicated
`verifyDictionary.legal` key (e.g. `disclaimerSummary`); the full legal
text (`verifyDictionary.legal.disclaimer`) MUST remain available but MAY
be placed behind a native `<details>/<summary>` disclosure so it does not
overwhelm a non-technical reader while remaining one interaction away.
Pending sign-off stays an internal comment (ADR-009).

#### Scenario: Disclaimer references eIDAS without authorship claim

- GIVEN the full disclaimer text (`verifyDictionary.legal.disclaimer`)
- WHEN scanned
- THEN it references eIDAS/"firma electrónica cualificada", asserts no
  authorship/ownership

#### Scenario: Plain-language summary is visible without interaction

- GIVEN a first-time visitor who never opens any disclosure
- WHEN they view the legal section of `/verify/[id]`
- THEN `verifyDictionary.legal.disclaimerSummary` is visible and
  conveys, in plain language, that this is not a qualified signature and
  only confirms the document was not altered

#### Scenario: Full legal text is one interaction away

- GIVEN the legal section rendered with the summary visible
- WHEN the user activates the disclosure trigger for the full legal text
- THEN `verifyDictionary.legal.disclaimer` becomes visible

### Requirement: Honest Page Badge, Network Naming Deferred to Supporting Content

`page.badge` MUST describe what the page does (a public, checkable
verification) in plain language and MUST NOT name a specific network or
the word "testnet" in this always-visible badge. It MUST NOT claim or
imply mainnet/production status either. Any honest disclosure of the
pilot/testnet network detail (e.g. within `legal`, `recompute`, or an
equivalent supporting/disclosure string) MAY continue to name the network,
consistent with `public-landing`'s FAQ-confined testnet naming.

#### Scenario: Badge omits the network/testnet name

- GIVEN `verifyDictionary.page.badge`
- WHEN scanned for "Base Sepolia" or "testnet"
- THEN neither substring is present

#### Scenario: Badge never implies mainnet/production

- GIVEN `verifyDictionary.page.badge`
- WHEN scanned for mainnet/production claims
- THEN it makes no such claim

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
