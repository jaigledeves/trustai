# Proposal: Honest Verdict Colors & De-duplicated Hero Copy

## Intent

Two landing/verify issues found during review:

1. **Honesty bug**: verdict UI uses a two-state color split (green/red). `PENDING_ANCHOR` — meaning nothing is proven yet — renders green with a checkmark, same as `VALID`. This contradicts the product's core thesis of honest, trustless verification.
2. **Copy duplication**: `Hero`'s `ctaMicrocopy` ("Gratis · Sin tarjeta · Sin instalar nada") repeats claims already covered by the `valueProps` list directly below it.

## Scope

### In Scope
- Three-state verdict semantics (`success` / `pending` / `error`) applied to `UploadVerdictPanel` (`/verify/[id]`), `VerificationDemo` (landing), and `HashOnlyCard`'s verdict-title color (hash-only card, `/verify/[id]` GET view).
- `PENDING_ANCHOR` → amber/warning styling with a distinct icon (clock/hourglass), not `Check`.
- Reorder `VerificationDemo`'s `VERDICT_ORDER` to semaphore order: `VALID → PENDING_ANCHOR → ASSET_MISMATCH → INVALID_RECORD`.
- New `--warning` / `--warning-foreground` design tokens in `apps/web/app/globals.css` (light + `.dark`), following the existing `--success` pattern.
- Extract a shared verdict-classification helper (`"success" | "pending" | "error"`) to remove the duplicated `isErrorVerdict` split across all three components (also found in `HashOnlyCard.tsx`, where it renders `PENDING_ANCHOR`'s title in the success color — same honesty bug).
- Remove `Hero`'s `ctaMicrocopy` paragraph and its now-unused `landing.ts` dictionary key.

### Out of Scope
- Changing verdict copy text (`verifyDictionary.verdicts` titles/messages) — color/icon/order only.
- Any other landing sections, backend verdict logic, or API contracts.
- Broader design-token audit beyond adding `--warning`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `web-public-verify`: "Upload Verdict, All Four States" — `PENDING_ANCHOR` MUST render as a distinct warning/pending state, not success.
- `public-landing`: "Honest Verification Demo" — same three-state rule; verdict button order changes to semaphore order.
- `web-theme`: add `--warning`/`--warning-foreground` semantic token pair (light + dark), same pattern as `--success`.

## Approach

- Add a shared helper, e.g. `classifyVerdict(verdict): "success" | "pending" | "error"`, in a location importable by `apps/web/components/verify/UploadVerdictPanel.tsx`, `apps/web/components/landing/VerificationDemo.tsx`, and `apps/web/components/verify/HashOnlyCard.tsx` (replaces each file's local `isErrorVerdict`).
- Map classification → Tailwind classes: `success` → `bg-success/10 text-success` + `Check`; `pending` → `bg-warning/10 text-warning` + clock/hourglass icon (e.g. `lucide-react`'s `Clock`); `error` → `bg-destructive/10 text-destructive` + `ShieldAlert`. `role` stays `"status"` for success/pending, `"alert"` for error.
- Add `--warning`/`--warning-foreground` to `:root` and `.dark` in `globals.css`, plus the matching `--color-warning`/`--color-warning-foreground` entries in the `@theme inline` block, mirroring the existing `--success` block exactly.
- Reorder `VERDICT_ORDER` array in `VerificationDemo.tsx`.
- Remove the `ctaMicrocopy` `<p>` in `Hero.tsx` and the `ctaMicrocopy` key in `dictionaries/es/landing.ts`.
- strict_tdd: update/extend `VerificationDemo.test.tsx`, `UploadVerdictPanel.test.tsx`, `HashOnlyCard.test.tsx`, and `dictionaries.test.ts` (copy-audit) FIRST to assert the new pending-state styling, new order, and absence of `ctaMicrocopy`, before touching implementation.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `apps/web/components/verify/UploadVerdictPanel.tsx` | Modified | Replace `isErrorVerdict` binary split with shared 3-state classifier; pending state gets warning color + clock icon |
| `apps/web/components/landing/VerificationDemo.tsx` | Modified | Same 3-state classifier; reorder `VERDICT_ORDER` |
| `apps/web/components/verify/HashOnlyCard.tsx` | Modified | Replace `isErrorVerdict` binary split with shared classifier for verdict-title color only; `documentIntegrity`/`anchored` badges unchanged |
| `apps/web/components/landing/Hero.tsx` | Modified | Remove `ctaMicrocopy` paragraph |
| `apps/web/dictionaries/es/landing.ts` | Modified | Remove unused `ctaMicrocopy` key |
| `apps/web/app/globals.css` | Modified | Add `--warning`/`--warning-foreground` tokens (light + dark) |
| (new) shared verdict-classification helper | New | Small pure function, colocated near `verify` components or in `lib/` |
| `apps/web/components/landing/VerificationDemo.test.tsx` | Modified | New assertions for pending styling/order (TDD, written first) |
| `apps/web/components/verify/UploadVerdictPanel.test.tsx` | Modified | New assertions for pending styling (TDD, written first) |
| `apps/web/components/verify/HashOnlyCard.test.tsx` | Modified | New assertion for pending verdict-title color (TDD, written first) |
| `apps/web/dictionaries/es/dictionaries.test.ts` | Modified | Remove/replace any assertion on `ctaMicrocopy` |

**Package**: `apps/web` only (no `api`, `dtr-core`, `utils`, or `smart-contracts` changes).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| New `--warning` token breaks contrast/AA in one theme mode | Low | Reuse `--success`'s oklch pattern (lightness/chroma tuned similarly per light/dark); verify visually in both modes |
| Shared classifier helper introduces import cycle between `landing` and `verify` components | Low | Place helper in a neutral shared module (e.g. `lib/`), not inside either component tree |
| Removing `ctaMicrocopy` breaks an existing copy-audit assertion in `dictionaries.test.ts` | Medium | Update that test first per strict_tdd; grep confirms only 2 references today (component + dictionary) |

## Rollback Plan

Single-package (`apps/web`), CSS-token + component-level change with no data/schema/API impact. Revert via `git revert` of the change's commit(s); no migration or feature flag needed.

## Dependencies

None.

## Success Criteria

- [ ] `PENDING_ANCHOR` never renders with `Check`/green styling in `UploadVerdictPanel`, `VerificationDemo`, or `HashOnlyCard`.
- [ ] All three components share one verdict-classification helper (no duplicated `isErrorVerdict`).
- [ ] `VerificationDemo` verdict buttons render in order `VALID, PENDING_ANCHOR, ASSET_MISMATCH, INVALID_RECORD`.
- [ ] `--warning`/`--warning-foreground` tokens exist in both `:root` and `.dark`.
- [ ] `Hero` no longer renders `ctaMicrocopy`; the dictionary key is removed.
- [ ] All four existing test files pass with tests written before implementation (strict_tdd).
- [ ] `verifyDictionary.verdicts` copy text is unchanged.
