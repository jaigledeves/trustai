# Exploration: refocus-verify-page-copy

## Current State

The public verify page (`/verify/[id]`, no-auth, code/tests refer to it as
spec domain `web-public-verify`) shows two Spanish-labelled server-provided
English strings, an unreframed testnet badge, jargon aimed at a technical
reader, and generic error states:

- `HashOnlyCard.tsx` renders `result.explanation` and `result.disclaimer`
  verbatim under Spanish labels (`t.explanationLabel` = "Explicación",
  `t.disclaimerLabel` = "Aviso legal"). Both come from `VerifyHashResponseDto`
  (`apps/api/.../public-verification/dto/verify-hash-response.dto.ts`),
  populated in `VerifyDocumentUseCase.verifyByHash`/`verifyByUpload` from two
  application-layer constants:
  - `EXPLANATIONS: Record<VerifyVerdict, string>` (`verify-document.use-case.ts:68`) — 4 English sentences.
  - `EIDAS_DISCLAIMER` (`eidas-disclaimer.ts`) — one English sentence. Its own
    doc comment already says: *"a future copy change — pending
    product/legal sign-off — touches exactly one place."* This is a
    pre-existing internal marker, not user-visible.
  - **Overclaim confirmed**: the disclaimer says the verification
    "certifies document integrity and authorship metadata." The DTR schema's
    `provenance` object (`packages/dtr-core/src/schema.ts:61-69`) is
    `{ provider, model, modelVersion, promptVersion, taxonomyVersion,
    analyzedAt }` — AI-analysis provenance, not human authorship. The system
    never captures or asserts who authored the document. The Spanish
    rewrite must drop "authorship" and say only integrity + AI-analysis
    provenance.
- Badge: `verifyDictionary.page.badge` = `"Verificación pública · Base
  Sepolia (testnet)"` — reads as unfinished, inconsistent with the already-
  shipped landing reframe (`landingDictionary.hero.badge` = "Anclado en una
  blockchain pública · Piloto sin costos en Base Sepolia", from
  `2026-08-05-refocus-landing-marketing-copy`).
- `verdicts` group (`verify.ts`) has `{ title, message }` per verdict, no
  plain-language layer. `ASSET_MISMATCH.message` says "...este DTR..." — bare
  jargon term for a first-time, non-technical reader.
- `ClientHashRecompute.tsx` always renders `recompute.caveat` inline —
  "...no reconstruye ni verifica el hash canónico anclado en la
  blockchain... consulta la documentación de dtr-core" — a dead-end
  reference for a layperson, always visible (adds friction/doubt), unlike
  the landing's now-standard `<details>` disclosure pattern
  (`HowItWorks.tsx`, `Faq.tsx`).
- `not-found.tsx` reuses generic `shellDictionary.errors.notFound` ("No
  encontramos lo que buscabas.") with no context about a broken/expired
  verification link, and `verify.ts`'s `page.disabledMessage` is a flat
  "not available right now" with no recovery action.

## Affected Areas

- `apps/web/dictionaries/es/verify.ts` — new/changed fields for verdict
  explanation, plain-language "qué significa", disclaimer (+ legal-pending
  marker), badge copy, DTR-free verdict messages, warmer not-found/disabled
  copy.
- `apps/web/components/verify/HashOnlyCard.tsx` — stop rendering
  `result.explanation`/`result.disclaimer`; render dictionary-owned Spanish
  copy instead (see Architectural Decision below).
- `apps/web/components/verify/HashOnlyCard.test.tsx` — currently asserts the
  mocked English `explanation`/`disclaimer` strings render verbatim; must
  flip to asserting dictionary copy renders and server strings do NOT.
- `apps/web/components/verify/ClientHashRecompute.tsx` +
  `.test.tsx` — wrap the caveat in a native `<details>` (Faq.tsx/HowItWorks.tsx
  pattern); tests move from always-visible assertions to
  collapsed-by-default + expandable assertions.
- `apps/web/app/verify/[id]/page.tsx` — badge copy only (data flows from
  dictionary already, no logic change).
- `apps/web/app/verify/[id]/not-found.tsx` + `.test.tsx` — likely a
  `verify.ts`-owned message (not `shellDictionary`) once it's link-specific;
  current test asserts `shellDictionary.errors.notFound` verbatim, must be
  updated if the key moves.
- `apps/web/dictionaries/es/dictionaries.test.ts` — new copy-audit
  assertions (no bare "DTR" in verdict messages, no "autor" in disclaimer,
  caveat still discloses no canonical/on-chain reconstruction even when
  reworded/relocated).
- `apps/web/components/landing/VerificationDemo.tsx` + `.test.tsx` — reads
  `verifyDictionary.verdicts[key].title`/`.message` directly (button
  accessible name = title, text = message). Any wording change to
  `verdicts.*.message` (rec 5's DTR removal) flows through automatically
  since the landing test reads from the dictionary, not a hardcoded
  duplicate — low risk, but confirms `verdicts` is a **shared, cross-spec
  surface** (`public-landing`'s "Honest Verification Demo" requirement
  depends on it). `landingDictionary.verificationDemo.recompute.caveat` is a
  **separate, independent string** — moving `verify.ts`'s caveat into a
  `<details>` does NOT touch the landing demo's own caveat copy.
- `apps/api/src/application/verification/verify-document.use-case.ts`,
  `eidas-disclaimer.ts` — **NOT touched** under the recommended option (see
  below); flagged only because the audit named them as the string source.
- No `apps/api` DTO/controller change — `VerifyHashResponseDto.explanation`/
  `.disclaimer` stay in the wire contract unchanged.

## Key Finding: `explanation`/`disclaimer` Usage Scope

Grepped the whole repo for `explanation`/`disclaimer` and `EXPLANATIONS`/
`EIDAS_DISCLAIMER`. Confirmed:

- **`HashOnlyCard.tsx`** (GET, hash-only card) is the **only** component that
  renders `result.explanation`/`result.disclaimer` to a user.
- **`UploadVerdictPanel.tsx`**'s `VerdictOutcome` receives the same fields on
  its response (`VerifyUploadResponse extends VerifyHashResponse`) but
  **never renders them** — it only renders `verifyDictionary.verdicts[verdict]`
  (dictionary-owned) plus `result.analysis`. So the POST path already
  ignores the server's `explanation`/`disclaimer` for display today.
- No authenticated dashboard, DTR detail view, or certify wizard reads these
  DTO fields at all — they are private to `web-public-verify`'s GET path
  display.
- Backend usage is limited to `VerifyDocumentUseCase` (producer),
  `public-verification.controller.ts` (passthrough to DTO), and their own
  unit/e2e specs (assert the fields are non-empty strings, not their exact
  content beyond `EIDAS_DISCLAIMER` equality).

**Conclusion**: changing how the web displays this copy has zero blast
radius outside `web-public-verify`'s hash-only card and its direct tests.

## RF-045 / Spec Requirement Analysis

- `docs/06-Requirements.md:89` — RF-045: *"Veredicto en lenguaje claro para
  no técnicos, explicitando qué se garantiza y qué no (sin implicar validez
  eIDAS)"* (UC-02). This is an **outcome/display requirement** — what the
  end user must see and understand — not an API-contract requirement about
  which layer owns the string. It says nothing about `apps/api` needing to
  own the Spanish text.
- INV-41 (`docs/07-Domain-Model.md:154`, "hash_only never exposes content or
  analysis") is unaffected by either option — it's a field-presence
  invariant already enforced at the TypeScript type level
  (`VerifyHashResponse` structurally has no `analysis` field).
- **No `openspec/specs/public-verification/spec.md` exists.** More
  precisely, **no domain spec exists at all for the public verify page** —
  code comments and test `describe()` blocks consistently reference `spec:
  web-public-verify` (e.g. `page.tsx`, `HashOnlyCard.tsx`,
  `UploadVerdictPanel.tsx`, `page.test.tsx`), but `openspec/specs/` only has
  `public-landing`, `web-certify-flow`, `web-visual-coherence`,
  `web-dtr-list`. This page predates (or was never captured by) the current
  SDD/OpenSpec adoption.
  - **Action for `sdd-spec`**: this change's delta must `ADD` a **new**
    domain spec `openspec/specs/web-public-verify/spec.md` — there is no
    existing main spec to `MODIFY`. The delta should capture the
    already-shipped baseline behavior (No-Auth Access, Hash-Only Card,
    Upload Verdict four states, GET/POST 404 asymmetry, INV-41) as the
    initial `ADDED` requirements, then add the new requirements this change
    introduces (Spanish verdict/disclaimer ownership, badge honesty, DTR-free
    verdict copy, plain-language layer, recompute-caveat disclosure, warm
    error states).
  - `public-landing`'s existing spec already has a hard dependency on
    `verifyDictionary.verdicts` and `verifyDictionary.recompute.caveat`
    (Requirement: "Honest Verification Demo"). This change should add a
    **cross-reference note** there (or leave it — the landing spec already
    reads through to `verify.ts` by reference, not by duplicated string), but
    does not need a `MODIFIED` block unless the verdict copy *shape* changes
    (see Open Decisions).

## The RNF-041 Architectural Decision

RNF-041 (openspec/config.yaml): all user-facing strings MUST live in
`apps/web/dictionaries/{locale}/*.ts`. Today's design violates this for
`explanation`/`disclaimer`: they are server-provided English strings
rendered under Spanish labels.

### Option W — web-owned copy (recommended)

`verify.ts` gains the Spanish verdict-explanation and disclaimer copy
(keyed by the 4-verdict enum); `HashOnlyCard.tsx` stops rendering
`result.explanation`/`result.disclaimer` and renders the dictionary's copy
instead. The API DTO/use-case is untouched — it keeps returning its English
strings on the wire (any non-web API consumer still gets them), the web
simply ignores those two fields for display.

- Pros: Fully complies with RNF-041; zero `apps/api` changes (no
  hexagonal-boundary risk, no application-layer test changes, no `strict_tdd`
  work on the API side); matches the exact pattern already used for
  `verdicts` (a comment in `verify.ts` even documents this split already);
  smallest blast radius (confirmed above — one component, its test, one
  dictionary file); the corrected "no authorship" disclaimer text ships
  purely as web copy, so a future re-translation or legal correction never
  touches domain code.
- Cons: Two sources of "the disclaimer" now exist (API English string +
  web Spanish string) — must document clearly (dictionary file comment +
  design.md) that the API's `EIDAS_DISCLAIMER`/`EXPLANATIONS` are legacy/API-
  contract-only and intentionally not the display source of truth, so a
  future engineer doesn't "fix" only one side and cause silent drift.
- Effort: Low.

### Option A — translate API constants

Translate `EXPLANATIONS`/`EIDAS_DISCLAIMER` to Spanish in `apps/api`. Single
source of truth preserved.

- Pros: One string, one place; no drift risk.
- Cons: Bakes a presentation/i18n concern into the application layer,
  violating both RNF-041 (literally: the string wouldn't live in
  `apps/web/dictionaries`) and the hexagonal-architecture rule in
  `openspec/config.yaml`'s `design` rules ("Respect hexagonal boundaries in
  apps/api — no adapter logic in ports/use-cases" — copy/i18n is
  presentation logic, arguably adapter-adjacent, not domain/application);
  requires `strict_tdd` RED/GREEN cycles in
  `verify-document.use-case.spec.ts` and `public-verification.e2e-spec.ts`
  (both currently assert `EIDAS_DISCLAIMER` by exact-string equality) for a
  change whose only consumer is the web's display layer; any future
  language/locale needs a second web dictionary layer anyway once
  `apps/web` supports more than `es`, at which point the API would need
  per-locale strings too — duplicating the dictionary pattern one layer
  down for no benefit.
- Effort: Low-Medium (touches two layers/repos' tests instead of one).

### Recommendation

**Option W.** RF-045 is a display/outcome requirement, not an API-contract
requirement (confirmed above); `explanation`/`disclaimer` have no other
consumer (confirmed above); Option W is the only option that satisfies
RNF-041 literally and keeps the change inside `apps/web`, consistent with
this repo's existing pattern (`verdicts` already works this way, and the
file-level comment in `verify.ts` already anticipates exactly this
split). **Flag for `sdd-design`: this decision should be captured as
ADR-009** (next available number — `docs/adr/` currently ends at
ADR-008) — it's a real tradeoff with a real, if minor, drift risk (two
disclaimer strings) that a future engineer needs the rationale for.

## Open Decisions for `sdd-propose`/`sdd-spec`/`sdd-design`

1. **Dictionary shape for the new copy.** Today `verify.ts.verdicts[V]` is
   `{ title, message }` and `message` is already Spanish, dictionary-owned,
   and shown by BOTH the real page and the landing demo. Rec 1 wants a
   Spanish "explanation" (translating what today's API `EXPLANATIONS`
   says) and rec 3 wants a separate one-line plain-language "qué
   significa." That's potentially THREE near-duplicate strings per verdict
   (`message`, a new `explanation`, a new `whatItMeans`) shown on one card —
   which itself risks reintroducing the audit's "too much text for a
   non-technical reader" problem. Decide during design whether `message`
   and the new "explanation" should be **merged** (one slightly longer,
   corrected, Spanish sentence that plays both roles) rather than adding a
   fourth field, keeping only `title` + `message` (technical-but-plain) +
   `whatItMeans` (rec 3's true one-liner for laypeople). Recommend
   consolidating rather than stacking three text blocks.
2. **Where the disclaimer/legal copy lives.** Whether it stays nested under
   `verifyDictionary.landing` (current `explanationLabel`/`disclaimerLabel`
   group) or moves to a new top-level group (e.g. `verifyDictionary.legal`)
   holding both the labels and the new Spanish disclaimer text + per-verdict
   explanations. A dedicated group makes the "this is legal text, treat
   carefully" boundary explicit in the source file.
3. **Whether to keep the API's English strings on the wire at all.** Under
   Option W they become dead weight for the web consumer specifically (but
   not necessarily for other API consumers). Decide: keep as-is (documented
   as intentionally unused by web), or file a follow-up to deprecate them
   from the DTO once confirmed no other consumer needs them — out of scope
   for this change either way; don't touch `apps/api` in this change.
4. **How to mark the disclaimer "pending legal sign-off."** Two real
   options with a genuine UX tradeoff:
   - (a) Internal-only marker: a source comment (mirroring the existing
     `eidas-disclaimer.ts` comment) + an explicit release-checklist/ADR gate
     before mainnet — never shown to end users.
   - (b) User-visible micro-note (e.g. small text near the disclaimer:
     "texto legal en revisión").
   Recommend (a): the eIDAS disclaimer itself already tells the user the
   verification isn't a qualified signature — stacking a second "and this
   text itself isn't finalized" caveat on top adds more jargon-adjacent
   doubt for a non-technical reader without a clear trust benefit, and
   nothing in RF-045 or the eIDAS regulation requires disclosing internal
   sign-off status to the end user. This is a product/legal call — confirm
   with the user during `sdd-propose`, don't decide unilaterally in design.
5. **`not-found.tsx` dictionary ownership.** Rec 7 wants link-specific
   copy ("this verification link is broken/expired"), which is
   `verify.ts`'s domain, not `shellDictionary`'s generic 404. Moving the key
   breaks `not-found.test.tsx`'s current assertion on
   `shellDictionary.errors.notFound` — that test must be updated in the
   same commit as the dictionary change (strict_tdd RED first).
6. **Disabled-state recovery action.** Rec 7 asks for a recovery action
   "if reasonable" — there's no obvious retry action for a globally-disabled
   feature flag (unlike a broken link). Decide during design whether
   "recovery" here just means warmer/clearer copy (e.g. pointing to the
   landing/registration flow) rather than a literal retry button.

## strict_tdd Implications

- Every dictionary content/shape change needs a RED assertion first in
  `dictionaries.test.ts` (new copy-audit tests, e.g.: no bare "DTR" in
  `verdicts.*.message`; disclaimer never matches `/autor/i`; badge doesn't
  read as "unfinished"/apologetic) before the GREEN `verify.ts` edit — same
  pattern as the archived `refocus-landing-marketing-copy` change.
- `HashOnlyCard.test.tsx` currently mocks and asserts the literal English
  `explanation`/`disclaimer` strings from `getVerifyHash`. Under Option W
  this test flips: RED — assert the dictionary's Spanish copy renders and
  the mocked server strings do NOT appear verbatim; GREEN — update
  `HashOnlyCard.tsx` to stop reading `result.explanation`/`.disclaimer`.
- `ClientHashRecompute.test.tsx` needs new assertions for the `<details>`
  wrapping (collapsed by default, caveat text reachable via
  `<summary>` toggle) — same shape as `Faq.tsx`'s existing test pattern.
  Existing "always visible" assertions must be updated, not just added to.
- `not-found.test.tsx` must be updated in lockstep with any dictionary-key
  move (see Open Decision 5).
- Zero `apps/api` test changes required under Option W (this is itself a
  strict_tdd cost argument in favor of W — Option A would require RED/GREEN
  cycles in both `verify-document.use-case.spec.ts` and
  `public-verification.e2e-spec.ts` for a change with only one real
  consumer).
- `page.test.tsx`/`layout.tsx` tests are unaffected (badge text isn't
  asserted there today — confirm no hidden literal-string assertion is
  added inadvertently).

## Honesty Locks to Preserve

- **INV-41**: hash-only view (`VerifyHashResponse`) must keep having no
  `analysis` field at the type level — this change doesn't touch that DTO.
- **No hash-reconstruction claim**: `ClientHashRecompute`'s caveat, wherever
  it's relocated/reworded, must keep asserting it does NOT reconstruct or
  verify the canonical/on-chain hash — only that it independently computes
  the uploaded file's own SHA-256. A copy-audit test should assert this
  survives the reword+relocation (mirror `dictionaries.test.ts`'s landing
  audit test #8/#9 pattern).
- **No authorship overclaim**: the corrected Spanish disclaimer must not
  claim to certify authorship — only integrity + AI-analysis provenance
  (`provenance.provider/model/modelVersion/...`, never "quién lo escribió").
- **Badge honesty**: reframing "testnet" as a strength must not claim
  mainnet/production status — it's still Base Sepolia. Same accuracy
  standard the landing audit already enforces (`dictionaries.test.ts`
  landing copy-audit tests never let reframing become misrepresentation).
- **GET vs POST 404 asymmetry**: untouched by this change — not in scope,
  but worth confirming no new-copy work accidentally implies GET should
  behave like POST for an unresolved id.

## Ready for Proposal

**Yes**, with the open decisions above surfaced to the user during
`sdd-propose` (dictionary shape consolidation, disclaimer group placement,
pending-legal-sign-off visibility, `not-found` key ownership). Recommend the
proposal explicitly names Option W and flags ADR-009 for `sdd-design`, and
notes that `sdd-spec` will `ADD` a new `web-public-verify` domain spec since
none currently exists.
