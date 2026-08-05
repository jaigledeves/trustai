# Proposal: Improve App Copy — Remove Jargon, Localize Failure Reasons, Explain "DTR"

## Intent

Three copy-quality problems hurt non-technical users of `apps/web`:

1. **Jargon** — "Anclar en blockchain", "Hash canónico (evidencia congelada)",
   "Anclaje" describe internal mechanisms, not user outcomes. A first-time
   user doesn't need to know "blockchain"/"hash canónico" to finish
   certifying a document.
2. **Raw API error leakage (RNF-041 violation)** — `ReviewStep.tsx` renders
   `record.analysisFailureReason` verbatim: an untranslated English string
   sourced from a pg-boss job's `output.message` (e.g. `"PDF has no
   extractable text layer (scanned PDFs are not supported in MVP — no
   OCR)"`). RNF-041 requires every user-facing string to come from a
   dictionary module — this bypasses it entirely.
3. **Unexplained acronym** — `/dtrs` (the authenticated list, the first
   screen after login) shows only `"Mis DTR"` as a heading, with no
   expansion of what "DTR" means, unlike the public landing/verify pages
   which already use the established Spanish term "Registro Digital de
   Confianza (DTR)".

This change rewords the affected dictionary strings, adds a native
`<details>` disclosure so the "frozen hash" technical nuance survives the
de-jargoning (not lost, just optional), adds an exact-match localization
lookup for the two known literal API failure messages with a generic
Spanish fallback, and adds a one-line subtitle to `/dtrs` reusing the
existing DTR expansion pattern.

## Scope

**Packages**: `apps/web` only. Zero `apps/api` changes — Rec 4 (localizing
`analysisFailureReason`) is a pure client-side mapping of an existing DTO
field already returned by the API; the API's error strings are read-only
reference, not modified.

### In Scope

- Reword `certifyDictionary`: `stepper.anchorLabel`, `confirm.frozenHashLabel`,
  `anchor.submit`, `anchor.anchoringMessage`, `anchor.certifiedMessage`.
- Add `certifyDictionary.confirm.frozenHashDisclosureLabel` +
  `.frozenHashDisclosure` — a native `<details>` disclosure in
  `CertifyWizard.tsx` explaining the frozen-hash technical nuance without
  forcing it into the main label.
- Add `certifyDictionary.analysisError` (`noTextLayer`, `noContent`,
  `generic`) + a pure `localizeFailureReason()` mapping function, wired into
  `ReviewStep.tsx` in place of the raw `analysisFailureReason` render.
- Reword `historyDictionary.detail`: `canonicalHashLabel`, `anchorTitle`,
  `anchorNotAnchored` (drop "anclado" wording).
- Add `historyDictionary.list.subtitle` + render it below the `<h1>` on
  `/dtrs` (`app/(dashboard)/dtrs/page.tsx`).

### Out of Scope

- `apps/api` — no DTO, controller, or job-handler changes. The 2 known
  literal failure strings (`NoTextLayerError`, `openai.adapter.ts`'s
  "returned no content") are mapped by the frontend; the dynamic Zod-issue
  string and defensive not-found errors fall through to a generic Spanish
  message, matching the exploration's own finding that they cannot be
  mapped 1:1.
- State badges (`historyDictionary.states.*`) — short by design, left as-is
  per exploration's recommendation (badge real estate can't carry an
  explanation; the `/dtrs` subtitle + detail-card label carry it instead).
- `WizardStepper.tsx`, `wizard-step.ts` — pure prop-through / dictionary
  pass-through, no logic change needed for a copy-only rename.

## Capabilities

### Modified Capabilities

- `web-certify-flow`: adds a plain-language requirement for stepper/anchor/
  confirm copy (so a future change can't silently reintroduce jargon) and a
  requirement that inline failure copy MUST be a localized, dictionary-
  sourced message, never a raw API string.
- `web-dtr-list`: adds a requirement for a subtitle expanding "DTR" on the
  authenticated list page.

### New Capabilities

None.

## Approach

Dictionary-value edits only for the jargon rewording (Rec 3's stepper/
anchor/confirm keys, Rec 5's list subtitle) — no component logic changes
beyond one structural addition: `CertifyWizard.tsx` gains a native
`<details>/<summary>` disclosure (same zero-JS pattern as
`Faq.tsx`/`HowItWorks.tsx`) next to the frozen-hash label. Rec 4 adds one
pure function, `localizeFailureReason(reason)`, colocated in
`certify.ts`'s module or `ReviewStep.tsx`, doing an exact-match lookup
against the 2 known literal API strings with a generic fallback — no
API/DTO changes, since the mapping happens entirely on the string already
present in `TrustRecordDetail.analysisFailureReason`.

## Affected Areas

| Area | Impact |
|------|--------|
| `dictionaries/es/certify.ts` | Reword 5 keys; add `frozenHashDisclosureLabel`, `frozenHashDisclosure`, `analysisError.{noTextLayer,noContent,generic}` |
| `dictionaries/es/history.ts` | Reword `detail.canonicalHashLabel`, `detail.anchorTitle`, `detail.anchorNotAnchored`; add `list.subtitle` |
| `certify/CertifyWizard.tsx` | Add `<details>` disclosure beside the frozen-hash label |
| `certify/ReviewStep.tsx` | Add `localizeFailureReason()`; replace raw `analysisFailureReason` render |
| `app/(dashboard)/dtrs/page.tsx` | Add subtitle `<p>` below the `<h1>` |
| Unit tests (5 files) | Update assertions on the reworded literal strings |
| E2E specs (2 files) | Update assertions on the reworded literal strings |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| E2E specs break silently (not run in TDD loop) | Medium | Explicitly listed in tasks; updated in the same PR, verified before merge |
| `localizeFailureReason` mis-detects a substring in an unrelated dynamic message | Low | Exact substring match against the 2 known fixed API strings only (`"no extractable text layer"`, `"returned no content"`); anything else falls to generic |
| Disclosure regresses accessibility (native `<details>` semantics) | Low | Same pattern already shipped in `Faq.tsx`/`HowItWorks.tsx` — no new a11y surface |

## Rollback Plan

Purely additive/renaming dictionary values and one new pure function — no
schema, migration, or API contract touched. `git revert` the commit(s);
each restores the prior copy and raw-string render with zero side effects.

## Dependencies

None external.

## Success Criteria

- [ ] No component renders `record.analysisFailureReason` directly — only
      through `localizeFailureReason()`.
- [ ] `certifyDictionary`/`historyDictionary` reworded keys match the
      approved copy; `dictionaries.test.ts`'s leaf-value guard stays green.
- [ ] `/dtrs` shows a DTR-expanding subtitle below the heading.
- [ ] `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build` all
      green, including the updated e2e specs.
