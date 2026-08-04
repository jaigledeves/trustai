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
the exact string "Registro Digital de Confianza (DTR)".
`dictionaries.test.ts` MUST assert this exact string appears verbatim in
`landingDictionary`.

#### Scenario: Exact terminology asserted in tests

- GIVEN `landingDictionary`
- WHEN `dictionaries.test.ts`'s terminology-lock test runs
- THEN it asserts the exact substring "Registro Digital de Confianza (DTR)"
  is present, failing if missing or altered

### Requirement: Honest Verification Demo

`VerificationDemo` MUST let a visitor toggle among the four real backend
verdicts (`VALID`, `ASSET_MISMATCH`, `PENDING_ANCHOR`, `INVALID_RECORD`),
sourcing verdict title/message copy from `verifyDictionary.verdicts` (not
re-authored). It MUST NOT claim the browser recomputes a file hash and
compares it against the on-chain/canonical hash. It MAY state the browser
independently recomputes the file's SHA-256, with caveat wording consistent
with `verifyDictionary.recompute.caveat`.

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

### Requirement: Accurate Anchoring Copy

Any "what is anchored" claim (hero card, HowItWorks step 3, FAQ) MUST state
that the SHA-256 hash of the DTR's RFC 8785 canonical serialization is
anchored on-chain. Copy MUST NOT state or imply that "the file's hash" is
anchored.

#### Scenario: HowItWorks step 3 states canonical-serialization hash

- GIVEN `landingDictionary.how.steps[2]`
- WHEN its description is rendered
- THEN it describes anchoring the SHA-256 hash of the DTR's canonical
  (RFC 8785) serialization, not the raw file's hash

#### Scenario: No "file hash is anchored" claim anywhere

- GIVEN all anchoring-related copy (hero, how, faq groups)
- WHEN scanned for "the file's hash is anchored" or equivalent phrasing
- THEN no such claim is present

### Requirement: Content-Audit Accuracy

`useCases` items MUST assert only integrity and timestamp claims
("existed unmodified since timestamp X") and MUST NOT assert authorship,
ownership, or issuer legitimacy. `faq` items MUST NOT promise pricing or
future paid plans. HowItWorks step 1 MUST state storage is encrypted with
AES-256-GCM (matches `apps/api/src/adapters/crypto/aes-gcm.adapter.ts`).

#### Scenario: Use-case copy avoids authorship/ownership claims

- GIVEN each `landingDictionary.useCases.items` description
- WHEN inspected
- THEN it claims only unmodified-since-timestamp integrity, never who
  authored, owns, or legitimately issued the content

#### Scenario: FAQ has no pricing promise

- GIVEN all `landingDictionary.faq.items`
- WHEN scanned for pricing/roadmap language
- THEN no item promises future paid plans or pricing commitments

#### Scenario: Step 1 names the real encryption algorithm

- GIVEN `landingDictionary.how.steps[0]`
- WHEN its description is rendered
- THEN it states storage is encrypted with AES-256-GCM

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
