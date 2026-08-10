# Delta for Web Public Verify

## MODIFIED Requirements

### Requirement: Honest Page Badge, Network Naming Deferred to Supporting Content

`page.badge` MUST describe what the page does (a public, checkable
verification) in plain language and MUST NOT name a specific network or
the word "testnet" in this always-visible badge. It MUST NOT claim or
imply mainnet/production status either. Any honest disclosure of the
pilot/testnet network detail (e.g. within `legal`, `recompute`, or an
equivalent supporting/disclosure string) MAY continue to name the network,
consistent with `public-landing`'s FAQ-confined testnet naming.
(Previously: `page.badge` was required to name "Base Sepolia" truthfully
as an always-visible, primary badge string.)

#### Scenario: Badge omits the network/testnet name

- GIVEN `verifyDictionary.page.badge`
- WHEN scanned for "Base Sepolia" or "testnet"
- THEN neither substring is present

#### Scenario: Badge never implies mainnet/production

- GIVEN `verifyDictionary.page.badge`
- WHEN scanned for mainnet/production claims
- THEN it makes no such claim

### Requirement: Client-Side Hash Recompute Honesty

`ClientHashRecompute` MUST independently compute the file's SHA-256
in-browser via `@trustai/dtr-core`'s `sha256Hex`, never claiming to
reconstruct/verify the on-chain/canonical hash. `verifyDictionary.recompute.caveat`
MUST use the same fingerprint noun and canonical on-chain verb mandated
by `web-plain-language`, and MUST be the single source of truth that
`landingDictionary.verificationDemo.recompute.caveat` matches.
(Previously: did not require this string to be the canonical source that
landing's equivalent caveat must match.)

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
(Previously: only the full legal-register `disclaimer` text existed, with
no plain-language summary required to be visible by default.)

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
