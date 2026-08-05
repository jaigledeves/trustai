# Design: Improve App Copy — Jargon, Failure Reasons, DTR Explanation

## Technical Approach

Almost entirely dictionary-value edits (`certify.ts`, `history.ts`) plus
two small, self-contained additions: a native `<details>` disclosure in
`CertifyWizard.tsx` and a pure `localizeFailureReason()` lookup wired into
`ReviewStep.tsx`. No new state machine, no API/DTO change, no new
component files. `WizardStepper.tsx`/`wizard-step.ts` need zero code
changes — they render/pass through whatever dictionary value they're
given, and `stepper.anchorLabel`'s VALUE (not its key) is what changes.

## Architecture Decisions

### Decision: Frozen-hash label vs. disclosure — what goes where

The brief's exact wording is slightly underspecified on whether
`frozenHashLabel` itself becomes the clickable `<summary>`, or whether it
stays a static field label with a separate disclosure trigger. Resolving
this against the exploration's own recommendation ("split into a plain
label + a native `<details>` disclosure ... mirroring `HowItWorks.tsx`'s
pattern") and basic disclosure-pattern conventions (a field name that
looks like a question is a discoverability regression):

| Option | Tradeoff | Verdict |
|---|---|---|
| (a) `frozenHashLabel` itself becomes the `<summary>` (whole label is clickable) | Field name reads as a question when idle; loses the "this is a labeled field" affordance | Rejected |
| (b) `frozenHashLabel` stays a static, always-visible field label; a separate `<details><summary>{frozenHashDisclosureLabel}</summary>` sits beside/below it, revealing `frozenHashDisclosure` | Matches `Faq.tsx`'s established pattern (question trigger, not a repurposed label); both new dictionary keys get a distinct, legible role | **Chosen** |

**Structure** (inside `CertifyWizard.tsx`'s existing `current.canonicalHash`
branch):

```tsx
<div role="status" className="flex flex-col gap-1.5">
  <p className={labelClassName}>{certifyDictionary.confirm.frozenHashLabel}</p>
  <details className="group">
    <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary marker:content-none">
      {certifyDictionary.confirm.frozenHashDisclosureLabel}
      <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-transform group-open:rotate-45">+</span>
    </summary>
    <p className="mt-1.5 text-sm text-muted-foreground">{certifyDictionary.confirm.frozenHashDisclosure}</p>
  </details>
  <code className="...">{current.canonicalHash}</code>
</div>
```

`CertifyWizard.tsx` is already `"use client"` (not a Server Component —
correcting the brief's assumption), so this is a moot constraint either
way: native `<details>` needs zero JS to toggle regardless of the
component's client/server boundary. No client-state hook is added for the
disclosure.

### Decision: `localizeFailureReason` — exact-match lookup, not a regex/i18n framework

| Option | Tradeoff | Verdict |
|---|---|---|
| (a) Full i18n framework / ICU message mapping | Massive overkill for 2 known literal strings + 1 fallback | Rejected |
| (b) Exact substring match against the known literal API messages, generic fallback for everything else | Matches exploration's own finding: only `NoTextLayerError`'s and the OpenAI adapter's messages are stable/literal; the Zod-issue and not-found strings are dynamic and shouldn't be pattern-matched (risk of false localization on dynamic content) | **Chosen** |

```ts
function localizeFailureReason(reason: string | null | undefined): string {
  if (!reason) return certifyDictionary.analysisError.generic;
  if (reason.includes("no extractable text layer")) {
    return certifyDictionary.analysisError.noTextLayer;
  }
  if (reason.includes("returned no content")) {
    return certifyDictionary.analysisError.noContent;
  }
  return certifyDictionary.analysisError.generic;
}
```

Lives in `ReviewStep.tsx` (colocated with its sole caller — no new module
needed for a 6-line pure function used in exactly one place). Matches the
exploration's explicit implication: "Rec 4's fix must be an exact-match
lookup for the known literal messages, with a generic Spanish fallback."

### Decision: `historyDictionary.list.subtitle` wording

Reuses the exact Spanish term already established by
`landingDictionary`/`verifyDictionary` ("Registro Digital de Confianza
(DTR)") rather than the login page's English expansion
(`authDictionary.login.subtitle` = "...Digital Trust Records.") —
consistency with the public-facing, already-shipped terminology beats
consistency with the one pre-login screen that predates this convention.

## Data Flow

    CertifyWizard (shell, "use client")
      ├─ frozenHashLabel (static) + <details> disclosure (frozenHashDisclosureLabel/frozenHashDisclosure)
      └─ DRAFT branch → ReviewStep
                          └─ hasAnalysisFailed(record) ? localizeFailureReason(record.analysisFailureReason) : editable fields

    DtrsListPage (RSC)
      └─ <h1>{historyDictionary.list.title}</h1>
      └─ <p>{historyDictionary.list.subtitle}</p>   ← new

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/dictionaries/es/certify.ts` | Modify | Reword `stepper.anchorLabel`, `confirm.frozenHashLabel`, `anchor.submit`, `anchor.anchoringMessage`, `anchor.certifiedMessage`; add `confirm.frozenHashDisclosureLabel`, `confirm.frozenHashDisclosure`, `analysisError.{noTextLayer,noContent,generic}` |
| `apps/web/dictionaries/es/history.ts` | Modify | Reword `detail.canonicalHashLabel`, `detail.anchorTitle`, `detail.anchorNotAnchored`; add `list.subtitle` |
| `apps/web/components/certify/CertifyWizard.tsx` | Modify | Add `<details>` disclosure beside the frozen-hash label |
| `apps/web/components/certify/ReviewStep.tsx` | Modify | Add `localizeFailureReason()`; render its result instead of the raw `record.analysisFailureReason` |
| `apps/web/app/(dashboard)/dtrs/page.tsx` | Modify | Add `<p>` subtitle below the `<h1>` |
| `apps/web/components/certify/CertifyWizard.test.tsx` | Modify | Update reworded-string assertions; add disclosure toggle assertion |
| `apps/web/components/certify/ConfirmButton.test.tsx` | Modify | Update the absent-hash-label assertion to the new label text |
| `apps/web/components/certify/AnchorPoller.test.tsx` | Modify | Update reworded-string assertions |
| `apps/web/components/certify/ReviewStep.test.tsx` | Modify | Assert the localized Spanish message renders, not the raw reason |
| `apps/web/components/history/DtrDetailCard.test.tsx` | Modify | Update the reworded `anchorNotAnchored` assertion |
| `apps/web/app/(dashboard)/dtrs/page.test.tsx` | Modify | Add subtitle-render assertion |
| `apps/web/e2e/certify-golden-path.spec.ts` | Modify | Update reworded-string assertions |
| `apps/web/e2e/public-verify.spec.ts` | Modify | Update reworded-string assertions |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (web) | `localizeFailureReason` — known text-layer / no-content / unknown-dynamic / null cases | RED-first in `ReviewStep.test.tsx`, table of inputs → expected dictionary value |
| Unit (web) | `CertifyWizard` frozen-hash label + disclosure toggle | RTL: label text present unconditionally; disclosure body appears after clicking the summary |
| Unit (web) | `AnchorPoller`/`ConfirmButton` reworded strings | Update existing assertions to new literal copy |
| Unit (web) | `DtrsListPage` subtitle | RTL: `historyDictionary.list.subtitle` renders regardless of list/empty state |
| Unit (web) | `dictionaries.test.ts` leaf-value guard | No code change — new keys auto-covered by the generic non-empty-string walk |
| E2E (Playwright) | Golden-path + public-verify flows | Update literal-string assertions to match new copy (not part of the RED/GREEN loop, but must not be left broken) |

## Migration / Rollout

No migration required — pure dictionary-value edits, one additive pure
function, one additive JSX element, one additive dictionary key. No
schema, no API contract change.

## Open Questions

None — the frozen-hash disclosure ambiguity is resolved above (Decision
1); no ADR needed, this is a copy/UX-composition choice, not a
port/contract tradeoff.
