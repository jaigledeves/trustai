## Exploration: improve-app-copy-jargon-dtr

Scope: `apps/web` only. No API changes — Rec 4 is a pure client-side
mapping of an existing DTO field, not a backend contract change.

### Current State

**Rec 3 — jargon locations (verbatim, with exact source path/key):**

| Jargon string | Dictionary key | Rendered in |
|---|---|---|
| `"Hash canónico (evidencia congelada)"` | `certifyDictionary.confirm.frozenHashLabel` | `CertifyWizard.tsx:91` — **not** `ReviewStep.tsx` as the brief assumed. It's rendered in the wizard shell (`CertifyWizard`), unconditionally once `canonicalHash` exists, so it persists across READY/ANCHORING/CERTIFIED. |
| `"Anclaje"` | `certifyDictionary.stepper.anchorLabel` | `WizardStepper.tsx:41` (renders `step.label`), sourced via `resolveWizardSteps()` in `wizard-step.ts:95` |
| `"Anclar en blockchain"` | `certifyDictionary.anchor.submit` | `AnchorPoller.tsx:75` — the primary CTA button in the READY branch (note: brief calls this `navigation.anchorCta`; the actual key is `anchor.submit`) |
| `"Anclando en la blockchain… esto puede tardar unos minutos."` | `certifyDictionary.anchor.anchoringMessage` | `AnchorPoller.tsx:88` (ANCHORING branch, brief called it `anchor.anchoring`) |
| `"¡Documento certificado! Puedes inspeccionar la transacción on-chain."` | `certifyDictionary.anchor.certifiedMessage` | `AnchorPoller.tsx:98` (CERTIFIED success banner title) |
| `"Hash canónico"` | `historyDictionary.detail.canonicalHashLabel` | `DtrDetailCard.tsx:69`, rendered via shared `labelClassName` = `uppercase tracking-wide text-xs` — visually uppercase via CSS, not the string itself |
| `"Anclaje en blockchain"` | `historyDictionary.detail.anchorTitle` | `DtrDetailCard.tsx:85` (brief called it `.anchorLabel`; actual key is `anchorTitle`), same uppercase CSS treatment |
| `"Listo para anclar"` (READY), `"Anclando"` (ANCHORING) | `historyDictionary.states.READY` / `.ANCHORING` | `StateBadge.tsx:35`, shared by `DtrTable` (list) and `DtrDetailCard` (detail) |

Correction vs. the brief: the uppercase visual is applied by a shared
Tailwind class (`text-xs font-medium uppercase tracking-wide
text-muted-foreground`) in both `DtrDetailCard.tsx` and inline in
`CertifyWizard.tsx` — the dictionary strings themselves are already
sentence-case (`"Hash canónico"`, `"Anclaje en blockchain"`). Only
`confirm.frozenHashLabel` has the extra `"(evidencia congelada)"` jargon
suffix baked into the string.

**Rec 4 — `analysisFailureReason` flow:**

`GET /trust-records/:id` (`trust-records.controller.ts:109-119`) sets
`analysisFailureReason` from the latest `analyze-document` pg-boss job's
`output.message` when that job is `failed` or `retry`
(`JOB_FAILURE_STATES`). This is untranslated, English, and — for one
failure mode — dynamically composed (Zod issue messages), so it cannot be
mapped by a fixed dictionary key alone. `ReviewStep.tsx:50` renders it
raw: `{record.analysisFailureReason}`.

**Rec 5 — "DTR" acronym:**

`/dtrs` (`app/(dashboard)/dtrs/page.tsx:66`) renders only
`historyDictionary.list.title` = `"Mis DTR"` as an `<h1>`, no subtitle.
The only existing expansion in the whole app is
`authDictionary.login.subtitle` = `"Accede a tus certificaciones y
Digital Trust Records."` (English acronym expansion, only ever seen
pre-login) and the public-facing `verifyDictionary`/`landingDictionary`,
which already use the Spanish pattern `"Registro Digital de Confianza
(DTR)"` — this is the established term to reuse for the authenticated
subtitle, not the login page's English "Digital Trust Records".

### Affected Areas

- `apps/web/dictionaries/es/certify.ts` — `stepper.anchorLabel`, `confirm.frozenHashLabel`, `anchor.submit`, `anchor.anchoringMessage`, `anchor.certifiedMessage`; new key(s) for Rec 4's failure-reason map + fallback
- `apps/web/dictionaries/es/history.ts` — `detail.canonicalHashLabel`, `detail.anchorTitle`, `states.READY`, `states.ANCHORING`; new key for Rec 5's DTR subtitle (likely under `list`)
- `apps/web/components/certify/CertifyWizard.tsx` — renders `frozenHashLabel` (line 91); candidate site for a `<details>` disclosure if that direction is chosen
- `apps/web/components/certify/WizardStepper.tsx` — pure presentational, renders whatever label it's given; no code change needed if only the dictionary value changes (labels come from props)
- `apps/web/components/certify/wizard-step.ts` — sources `stepper.anchorLabel` into step info; no logic change needed for a copy-only fix
- `apps/web/components/certify/AnchorPoller.tsx` — renders `anchor.submit` (CTA), `anchor.anchoringMessage`, `anchor.certifiedMessage`
- `apps/web/components/certify/ReviewStep.tsx` — `hasAnalysisFailed()` (line 26-30) and the raw render at line 50; needs a lookup function against `record.analysisFailureReason` instead of direct interpolation
- `apps/web/components/history/DtrDetailCard.tsx` — renders `detail.canonicalHashLabel`, `detail.anchorTitle`
- `apps/web/components/history/StateBadge.tsx` — renders `historyDictionary.states[state]`, shared by list + detail
- `apps/web/app/(dashboard)/dtrs/page.tsx` — add subtitle below the `<h1>{historyDictionary.list.title}</h1>` at line 66
- `apps/api/src/application/certification/jobs/analyze-document.handler.ts` / `apps/api/src/ports/text-extraction.port.ts` / `apps/api/src/adapters/ai/openai.adapter.ts` — **read-only reference** for Rec 4's known error strings (no API changes)

### Rec 4 — known `analysisFailureReason` values (from the API, read-only)

Traced every `throw` reachable from `AnalyzeDocumentHandler.handle()`
(the only producer of `analyze-document` job failures):

1. `"PDF has no extractable text layer (scanned PDFs are not supported in MVP — no OCR)"` — `NoTextLayerError` (`text-extraction.port.ts:11`). **Fixed string, most common real-world failure** (scanned PDF, RF-023 no-OCR).
2. `"OpenAI returned no content for the analysis request"` — `openai.adapter.ts:115`. Fixed string.
3. `` `AI provider returned schema-invalid analysis: ${issues}` `` — `AiAnalysisValidationError` (`analyze-document.handler.ts:38-43`). **Dynamic** — `issues` is a joined list of Zod validation messages, in English, unbounded content. Cannot be mapped 1:1.
4. `` `TrustRecord not found: ${id}` `` / `` `DigitalAsset not found: ${id}` `` (`analyze-document.handler.ts:81,94`) — defensive/should-never-happen errors (INV-21 violation guards), dynamic (includes an id).
5. `"Document analysis failed"` — controller fallback (`trust-records.controller.ts:117`) used only when `latestJob.output.message` is falsy.

Implication: only #1 and #2 are stable, literal strings that a
dictionary lookup table can map exactly. #3, #4, #5 are either dynamic
or a deliberate generic fallback. **Rec 4's fix must be an exact-match
lookup for the known literal messages, with a generic Spanish fallback
message for everything else** (matches the brief's own suggested
direction) — do not attempt to translate the dynamic Zod-issue string.

### Rec 3 — Direction recommendations

1. **`"Hash canónico (evidencia congelada)"`** → Split into a plain
   sentence-case label ("Huella digital del documento" or "Código de
   verificación del documento") + a native `<details>` disclosure
   mirroring `HowItWorks.tsx`'s pattern (`<details><summary>` with a
   short technical note explaining "esta huella queda fija una vez
   confirmada y no puede cambiar"). This preserves the technical
   "frozen evidence" nuance for advanced users without forcing it on
   everyone. Lower-effort alternative: just drop the parenthetical and
   keep "Huella digital del documento" as the label — cheaper, but loses
   the "frozen" semantic that INV-22/24 cares about.
2. **`"Anclar en blockchain"` CTA** → Recommend **"Finalizar
   certificación"** over "Registrar en blockchain" (still jargon-adjacent).
   "Finalizar certificación" describes the *outcome* the user cares
   about (completing certification) rather than the *mechanism*
   (blockchain), which is the actual UX problem here — non-technical
   users don't need to know "blockchain" to click the button that
   finishes their task. If dropping "blockchain" entirely feels too
   opaque, an alternative is "Confirmar y registrar" — but "Finalizar
   certificación" reads clearest against the wizard's own step labels
   ("Certificado" is the terminal state, so "Finalizar certificación"
   telegraphs where the CTA leads).
3. **`"HASH CANÓNICO"` / `"ANCLAJE EN BLOCKCHAIN"` uppercase** →
   Correction: these are *not* literally uppercase strings — the
   dictionary values are sentence-case (`"Hash canónico"`, `"Anclaje en
   blockchain"`) and the visual uppercase comes from the shared
   `labelClassName` Tailwind utility in `DtrDetailCard.tsx`. Fixing the
   jargon is a dictionary-value change (align with whatever plain-
   language label #1 lands on, plus rename `anchorTitle` to something
   like "Registro en blockchain" or reuse #2's chosen verb), not a
   case-transform change. The uppercase *styling* itself is a design
   convention (`design.md`'s "canonical Uppercase label" recipe) shared
   across the app and out of scope here.
4. **State badges `"Listo para anclar"` / `"Anclando"`** → These are
   short by design (badge real estate is tiny) and can't carry an
   explanation inline. Recommend leaving the short badge text mostly
   as-is (or aligning its verb with whatever CTA label #2 picks, e.g.
   "Listo para finalizar" / "Finalizando") and relying on the
   `/dtrs` list subtitle (Rec 5) plus a plain-language label at the
   `DtrDetailCard`'s anchor field to carry the explanation — not
   cramming an explanation into the 2-3 word badge.

### Existing specs referencing these components

- `openspec/specs/web-certify-flow/spec.md` — **directly pins copy
  sources by dictionary path**: "Five-Step Progress Indicator" requires
  labels "MUST come from `certifyDictionary.stepper`"; "Inline Failure
  State" requires copy "MUST come from
  `certifyDictionary.review.analysisFailedTitle`" /
  `.anchor.errorGeneric`; "Terminal-State Exit CTAs" pins
  `certifyDictionary.anchor.viewDetailAction`/`.backToListAction` and
  `.discard.certifyAnotherAction`/`.backToListAction`. None of these
  pinned keys are the ones Rec 3/4 touch (`confirm.frozenHashLabel`,
  `stepper.anchorLabel`, `anchor.submit/anchoringMessage/
  certifiedMessage`), so changing their *values* (not the keys) doesn't
  violate this spec's letter, but a delta spec should still be added
  formalizing the new plain-language requirement so a future change
  can't silently reintroduce jargon.
- `openspec/specs/web-dtr-list/spec.md` — "List Search & Filter
  Controls" pins `historyDictionary.list` as the source for the page's
  labels; adding a subtitle key under `historyDictionary.list` is
  consistent with this spec's existing constraint ("All labels ...
  MUST come from `historyDictionary.list`"). No spec currently requires
  or forbids a subtitle — Rec 5 needs a new `ADDED Requirement`.
- No spec currently governs `historyDictionary.detail.*` (the detail
  card) or `analysisFailureReason` rendering rules beyond
  `web-certify-flow`'s failure-visibility requirement (which only pins
  the *title*, not the body text) — Rec 3 (detail card) and Rec 4 both
  need new/modified requirements, likely in `web-certify-flow` (Rec 4,
  since it's the same "Inline Failure State" requirement family) and a
  new `web-history` or extension to `web-dtr-list` for Rec 3's detail
  card + Rec 5.

### Strict_tdd implications — test files to update

**Unit (Vitest), asserting the exact jargon strings that will change:**

- `apps/web/components/certify/CertifyWizard.test.tsx` — asserts `"Hash canónico (evidencia congelada)"` (line 116) and `"Anclar en blockchain"` (line 119)
- `apps/web/components/certify/ConfirmButton.test.tsx` — asserts absence of `"Hash canónico (evidencia congelada)"` (lines 45, 64)
- `apps/web/components/certify/AnchorPoller.test.tsx` — asserts `"Anclar en blockchain"` button name (lines 68, 70, 100) and `"Anclando en la blockchain… esto puede tardar unos minutos."` (lines 73, 80, 153)
- `apps/web/components/certify/WizardStepper.test.tsx` — passes `"Anclaje"` as a literal prop in its own fixtures (lines 24, 30, 42, 51, 56) — these are test-authored fixtures, not reads from the dictionary, so they only need updating if the test is changed to assert the *real* dictionary value flows through; currently they test the component in isolation and are unaffected by a dictionary change unless rewritten to import `certifyDictionary`
- `apps/web/components/certify/wizard-step.test.ts` — uses `resolveWizardSteps()` which pulls `certifyDictionary.stepper.anchorLabel` live; check for literal `"Anclaje"` assertions
- `apps/web/components/certify/ReviewStep.test.tsx` — line 70/75 asserts the raw `analysisFailureReason` string `"no extractable text layer"` renders verbatim — **this assertion is the RNF-041 violation itself** and must be rewritten to assert the *mapped* Spanish string once Rec 4 lands
- `apps/web/components/history/DtrDetailCard.test.tsx` — will assert `canonicalHashLabel`/`anchorTitle` text; needs reading in full during `sdd-spec`/`sdd-apply` to find exact assertions
- `apps/web/components/history/DtrTable.test.tsx` — asserts `"Certificado"`/`"Borrador"` state labels (lines 36-37); READY/ANCHORING label changes need equivalent assertions checked across this file
- `apps/web/dictionaries/es/dictionaries.test.ts` — generic non-empty-string guard (safe against any copy change) — no update needed unless a new dictionary group is added
- `apps/web/app/(dashboard)/dtrs/page.test.tsx` — no current subtitle assertion; Rec 5 needs a **new** test case here (or in a `DtrsListPage`-adjacent test) asserting the subtitle renders
- `apps/web/app/(dashboard)/dtrs/[id]/page.test.tsx` — imports `analysisFailureReason: null` fixture; check for jargon-string assertions once read in full

**E2E (Playwright), asserting exact jargon strings — will break on copy change:**

- `apps/web/e2e/certify-golden-path.spec.ts` (lines 100, 113, 115) — asserts `"Hash canónico (evidencia congelada)"`, clicks button named `"Anclar en blockchain"`, asserts `"Anclando en la blockchain… esto puede tardar unos minutos."`
- `apps/web/e2e/public-verify.spec.ts` (lines 95, 159, 161) — same three assertions, duplicated in this flow

Since `strict_tdd: true`, the task plan must sequence: (1) update/red
the unit test assertion for the new copy before (2) changing the
dictionary value, then (3) update the two e2e specs in the same PR
(e2e tests aren't run in the normal TDD red/green loop but must not be
left broken).

### Ready for Proposal

Yes. Enough is known to scope a proposal:

- Rec 3 needs dictionary value changes (2 files) + one structural
  change if the `<details>` disclosure direction is chosen for the
  frozen-hash label (touches `CertifyWizard.tsx`); otherwise copy-only.
- Rec 4 needs a small pure function (e.g.
  `resolveAnalysisFailureMessage(reason: string | null): string`) in
  `certify.ts` or a sibling module, mapping the 2 known literal API
  messages to Spanish with a generic fallback, wired into
  `ReviewStep.tsx` in place of the raw interpolation.
- Rec 5 needs one new dictionary key + one JSX line in
  `app/(dashboard)/dtrs/page.tsx`.
- Open decision for the proposal/design phase: exact wording for the
  CTA ("Finalizar certificación" recommended) and whether the frozen-
  hash disclosure gets the full `<details>` treatment or a simpler
  label swap — both are reasonable, effort differs (Low vs. Medium).
- Delta specs needed: `web-certify-flow` (Rec 3's stepper/anchor/CTA
  copy + Rec 4's failure-reason mapping) and `web-dtr-list` (Rec 5's
  subtitle) at minimum; consider a new `web-history` spec for the
  detail card if one doesn't already implicitly exist elsewhere.
