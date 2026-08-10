# Public Landing Specification

## Purpose

Defines behavior for the public marketing landing page at route `/`
(`apps/web/app/page.tsx`), composed from Server Component sections under
`apps/web/components/landing/`.

## Non-Goals

- Dark mode, `next-themes`, `.dark` selectors, or `prefers-color-scheme`.
- Changes to `apps/api`, `packages/dtr-core`, or smart contracts.
- New dependencies (no `@base-ui/react` port; reuse `lucide-react`, `components/ui/button.tsx`).
- Modifications to `mockups/landing/**` (reference-only).

## Requirements

### Requirement: Landing Composition

The system MUST render route `/` as a Server Component (`apps/web/app/page.tsx`)
composing Nav, Hero, HowItWorks, VerificationDemo, UseCases, Pillars, Faq,
FinalCta, and Footer sections from `apps/web/components/landing/`. Only
`VerificationDemo` MUST declare `'use client'`; every other section MUST NOT.

#### Scenario: Page renders all sections in order

- GIVEN a visitor requests `/`
- WHEN the page renders
- THEN Nav, Hero, HowItWorks, VerificationDemo, UseCases, Pillars, Faq,
  FinalCta, and Footer each render exactly once, in that order

#### Scenario: Only VerificationDemo ships client JS

- GIVEN the composed page's section modules
- WHEN each is inspected for a `'use client'` directive
- THEN only `VerificationDemo.tsx` has it; the rest MUST NOT

### Requirement: Dictionary-Sourced Copy (RNF-041)

Every user-facing string in landing sections MUST resolve from
`landingDictionary` (`apps/web/dictionaries/es/landing.ts`); no section MUST
contain inline JSX string literals for user-facing copy. `landingDictionary`
MUST define `nav`, `hero`, `how`, `verificationDemo`, `useCases`, `pillars`,
`faq`, `cta`, and `footer` groups.

#### Scenario: No inline literal copy in a section

- GIVEN any landing section component
- WHEN its JSX is inspected
- THEN every rendered text node references a `landingDictionary` key path,
  never a literal string

#### Scenario: New dictionary groups are present and non-empty

- GIVEN `landingDictionary`
- WHEN `dictionaries.test.ts`'s leaf-value guard runs
- THEN `useCases`, `faq`, and `verificationDemo` groups exist and every leaf
  is a non-empty string

### Requirement: Light-Mode-Only Styling

Landing sections MUST NOT introduce `.dark` selectors, `prefers-color-scheme`
media queries, or `--success*` custom properties. Success/live indicators
MUST use existing `emerald-*` Tailwind utilities.

#### Scenario: No dark-mode or success-token artifacts

- GIVEN the diff introduced by this change
- WHEN `globals.css` and `components/landing/*` are inspected
- THEN no `.dark` rule, `prefers-color-scheme` query, or `--success` custom
  property appears; success/live indicators use `emerald-*` classes only

### Requirement: Central Artifact Terminology Lock

Every reference to the central certified artifact in landing copy MUST use
the exact string "Registro Digital de Confianza (DTR)" on first mention
within a page section, per `web-plain-language`'s canonical-name
requirement. `dictionaries.test.ts` MUST assert this exact string appears
verbatim in `landingDictionary`. The hero card's `label`
(`landingDictionary.hero.card.label`) MUST NOT be the visitor's first
encounter of an unexplained "DTR" acronym in the hero: either the hero
card carries the full expansion, or the hero copy preceding the card
already introduced "Registro Digital de Confianza (DTR)".

#### Scenario: Exact terminology asserted in tests

- GIVEN `landingDictionary`
- WHEN `dictionaries.test.ts`'s terminology-lock test runs
- THEN it asserts the exact substring "Registro Digital de Confianza (DTR)"
  is present, failing if missing or altered

#### Scenario: Hero never shows a bare unexplained "DTR"

- GIVEN the hero section's rendered copy up to and including
  `landingDictionary.hero.card.label`
- WHEN scanned for the acronym "DTR"
- THEN every occurrence is preceded, within the hero, by the full
  "Registro Digital de Confianza" expansion

### Requirement: Testnet Naming Confined to FAQ

The hero badge (`landingDictionary.hero.badge`) and hero card's
`statusBadge`/`network`/`footerNote` MUST NOT name "Base Sepolia" or
"testnet"; they MUST describe the on-chain guarantee in plain language
using the canonical on-chain verb from `web-plain-language`. The network
name and testnet/pilot status MAY still appear in
`landingDictionary.faq.items` (the existing "¿Por qué usan Base Sepolia?"
entry) and in `landingDictionary.footer.contractLabel`/`contractLinkLabel`,
which remain supporting-section, opt-in reading.

#### Scenario: Hero badge omits the network/testnet name

- GIVEN `landingDictionary.hero.badge`
- WHEN scanned for "Base Sepolia" or "testnet"
- THEN neither substring is present

#### Scenario: Hero card omits the network/testnet name

- GIVEN `landingDictionary.hero.card.statusBadge`,
  `landingDictionary.hero.card.network`, and
  `landingDictionary.hero.card.footerNote`
- WHEN scanned for "Base Sepolia" or "testnet"
- THEN neither substring is present in any of them

#### Scenario: FAQ still names the network honestly

- GIVEN `landingDictionary.faq.items`
- WHEN scanned for the "¿Por qué usan Base Sepolia?" entry
- THEN it still names "Base Sepolia" and the testnet/pilot status,
  unchanged from the current honest disclosure

### Requirement: Honest Verification Demo

`VerificationDemo` MUST let a visitor toggle among the four real backend
verdicts (`VALID`, `ASSET_MISMATCH`, `PENDING_ANCHOR`, `INVALID_RECORD`),
sourcing verdict title/message copy from `verifyDictionary.verdicts` (not
re-authored). It MUST NOT claim the browser recomputes a file hash and
compares it against the on-chain/canonical hash. It MAY state the browser
independently recomputes the file's SHA-256, with caveat wording consistent
with `verifyDictionary.recompute.caveat`. `landingDictionary.verificationDemo`
copy MUST use the same fingerprint term and on-chain verb mandated by
`web-plain-language`, matching `verifyDictionary`'s equivalent copy.

#### Scenario: Toggling shows each real verdict's copy

- GIVEN VerificationDemo is rendered
- WHEN a visitor selects each of the four verdict options in turn
- THEN the displayed title/message match `verifyDictionary.verdicts.VALID`,
  `.ASSET_MISMATCH`, `.PENDING_ANCHOR`, `.INVALID_RECORD` respectively

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

### Requirement: Accurate Anchoring Copy

Any "what is anchored" claim (hero card, HowItWorks, FAQ) MUST state that
the SHA-256 hash of the DTR's RFC 8785 canonical serialization is anchored
on-chain, using the fingerprint term and on-chain verb mandated by
`web-plain-language`. Copy MUST NOT state or imply that "the file's hash"
is anchored. The claim MAY live within `landingDictionary.how.technicalDetail`
(a structured technical-detail block — e.g. an `intro` string plus
`items: { term, desc }[]`) instead of `landingDictionary.how.steps[3].description`;
wherever it lives, the accuracy invariant below MUST hold, and
`how.steps[3]` (the anchoring step) MUST be understandable without
requiring the reader to open `technicalDetail`.

#### Scenario: HowItWorks states canonical-serialization hash accurately

- GIVEN `landingDictionary.how.technicalDetail` and
  `landingDictionary.how.steps[3].description`
- WHEN whichever of the two carries the anchoring claim is rendered
- THEN it describes anchoring the SHA-256 hash of the DTR's canonical
  (RFC 8785) serialization, not the raw file's hash

#### Scenario: No "file hash is anchored" claim anywhere

- GIVEN all anchoring-related copy (hero, how groups including
  `how.technicalDetail`, faq groups)
- WHEN scanned for "the file's hash is anchored" or equivalent phrasing
- THEN no such claim is present

#### Scenario: Step 4 is plain language without opening the technical detail

- GIVEN a first-time visitor who never activates `technicalDetailLabel`
- WHEN they read `landingDictionary.how.steps[3].title` and `.description`
  alone
- THEN they understand that the document's fingerprint is permanently
  recorded on a public ledger, without needing "blockchain" jargon
  unexplained

### Requirement: Content-Audit Accuracy

`useCases` items MUST assert only integrity and timestamp claims
("existed unmodified since timestamp X") and MUST NOT assert authorship,
ownership, or issuer legitimacy. `faq` items MUST NOT promise pricing or
future paid plans. HowItWorks copy MUST state storage is encrypted with
AES-256-GCM (matches `apps/api/src/adapters/crypto/aes-gcm.adapter.ts`);
this statement MAY live within `landingDictionary.how.technicalDetail`
(a structured technical-detail block, not necessarily a single string)
instead of `landingDictionary.how.steps[0].description`. FAQ items that
mention "blockchain" or a network name (e.g. "¿Se publica mi documento en
la blockchain?", "¿Necesito saber de blockchain para usarlo?") MUST pair
the term with a plain-language framing per `web-plain-language`'s
unavoidable-terms requirement.

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

#### Scenario: Blockchain-mentioning FAQ items frame the term in plain language

- GIVEN the FAQ items that mention "blockchain"
- WHEN each is inspected
- THEN it explains, in the same answer, what that means for the user in
  plain language

### Requirement: Pillars Copy Uses Plain Language

`landingDictionary.pillars.items` descriptions MUST be understandable
without requiring the reader to already know "criptográfica",
"anclado"/the raw on-chain verb, or "hash" as unexplained jargon; each
pillar description MUST either avoid these terms or pair them with a
plain-language framing in the same sentence.

#### Scenario: "Verificación independiente" pillar avoids unexplained jargon

- GIVEN `landingDictionary.pillars.items[0].description`
- WHEN read on its own
- THEN it conveys the independence guarantee without an unexplained raw
  technical term

#### Scenario: "Integridad criptográfica" pillar frames its title term

- GIVEN `landingDictionary.pillars.items[1].title` ("Integridad
  criptográfica") and `.description`
- WHEN read together
- THEN the description explains in plain language what changes when a
  byte changes, without requiring prior cryptography knowledge

### Requirement: Config-Driven Navigation & Links

CTA and link `href`s MUST resolve via `apps/web/lib/config.ts` and MUST NOT
hardcode alternate values: `/login`, `/register`,
`` /verify/${config.demoDtrId} ``, and the contract-explorer URL built from
`config.chainExplorerBaseUrl`. The demo-verification link MUST render only
when `config.demoDtrId` is defined.

#### Scenario: Demo verification CTA hidden when unset

- GIVEN `config.demoDtrId` is `undefined`
- WHEN Hero renders
- THEN no demo-verification link is rendered

#### Scenario: Demo verification CTA shown when set

- GIVEN `config.demoDtrId` is a defined string
- WHEN Hero renders
- THEN a link to `` /verify/${config.demoDtrId} `` is rendered

### Requirement: Test Coverage (strict_tdd)

`VerificationDemo` MUST have behavior tests covering verdict toggling for all
four verdicts. `dictionaries.test.ts` MUST validate the new
`landingDictionary` shape (leaf-value guard) and the terminology exact-copy
lock. `apps/web/app/page.tsx` MUST gain page-level test coverage, consistent
with other Server Component pages (e.g. `app/verify/[id]/page.test.tsx`).

#### Scenario: VerificationDemo test covers all four verdicts

- GIVEN `VerificationDemo.test.tsx`
- WHEN run
- THEN it asserts correct copy renders for VALID, ASSET_MISMATCH,
  PENDING_ANCHOR, and INVALID_RECORD after each toggle action

#### Scenario: page.tsx gets its first test

- GIVEN `app/page.test.tsx` (new)
- WHEN run
- THEN it asserts all sections render and the `demoDtrId`-guarded link
  behaves per the Config-Driven Navigation & Links requirement
