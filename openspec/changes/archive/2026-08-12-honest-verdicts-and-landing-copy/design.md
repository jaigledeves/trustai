# Design: Honest Verdict Colors & De-duplicated Hero Copy

## Technical Approach

Verdict severity becomes a shared domain concern, not a per-component
`isErrorVerdict` boolean. A new pure module, `apps/web/lib/verify/verdict.ts`,
owns the verdict→severity mapping and the severity→presentation table
(class, icon, ARIA role). `UploadVerdictPanel`, `VerificationDemo`, and
`HashOnlyCard` all import it — zero duplicated classification logic across
the three consumers. A `--warning`/`--warning-foreground` token pair mirrors
`--success` in `globals.css`, so `pending` gets a real semantic color
instead of a hardcoded amber utility.

`HashOnlyCard` (the GET-only, no-analysis hash card) has its own local
`isErrorVerdict`, discovered after the initial design pass, with the same
honesty bug: its verdict-title color (`text-destructive` vs `text-success`)
renders `PENDING_ANCHOR` green. It consumes only the severity→color slice of
the shared table (no `role` change — the title is a heading, not a
status/alert region; no icon change — the card doesn't render a verdict
icon). Its unrelated `documentIntegrity` badge and `anchored` badge stay
binary/untouched — they are genuine booleans, not the pending-verdict
issue.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Classifier location | `apps/web/lib/verify/verdict.ts` (new) | Colocate in one component, import into the other | Avoids a `landing↔verify` import edge; matches `lib/theme.ts` precedent (pure fn + colocated test) |
| Classifier shape | `classifyVerdict()` (pure) + `VERDICT_SEVERITY_STYLES` table (class/Icon/role) | One function returning the full style object | Classifier stays trivially unit-testable (string→string); style table is presentation-only, shared verbatim |
| Icon in `VerificationDemo` | Add an icon via the shared table (previously icon-less) | Leave it icon-less | Delta spec's "no check icon" scenario only makes sense if the demo renders *an* icon; keeps both surfaces consistent |
| `Light-Mode-Only Styling` (canonical `public-landing`) | Narrow scope at archive time — see Resolution | Record `bg-warning` as a documented exception, leave wording untouched | Requirement already contradicts shipped code and predates dark mode (ADR-011); an "exception" note would leave a permanently-false canonical rule |

### Resolution: `Light-Mode-Only Styling` tension

That requirement (no `.dark`, no `--success*`, `emerald-*` only) predates
`--success` adoption and ADR-011's dark mode. It's already violated by
shipped code (`Hero.tsx`, `VerificationDemo.tsx` both use `bg-success/10
text-success` today) — this change adds to existing drift, not new drift.
**Resolution**: at archive, replace the requirement's text with "Landing
success/pending indicators use the `--success`/`--warning` semantic tokens
(light + dark), consistent with the rest of the app," retiring the
`emerald-*`/light-only mandate. This design does not perform that rewrite
(out of scope); `sdd-archive` reconciles the canonical wording.

## Data Flow

    VerifyVerdict ──► classifyVerdict() ──► VERDICT_SEVERITY_STYLES[severity]
                                                    │
                                { className, Icon, role }
                                 /                        \
        UploadVerdictPanel's <VerdictOutcome>    VerificationDemo's outcome <div>

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/lib/verify/verdict.ts` | Create | `VerdictSeverity`, `classifyVerdict`, `VERDICT_SEVERITY_STYLES` |
| `apps/web/lib/verify/verdict.test.ts` | Create | 4 verdicts → expected severity |
| `.../verify/UploadVerdictPanel.tsx` | Modify | Delete `isErrorVerdict`; `VerdictOutcome` uses shared table |
| `.../verify/UploadVerdictPanel.test.tsx` | Modify | Add PENDING_ANCHOR: `status`, no `Check`/success color |
| `.../landing/VerificationDemo.tsx` | Modify | Delete `isErrorVerdict`; reorder `VERDICT_ORDER`; use shared table |
| `.../landing/VerificationDemo.test.tsx` | Modify | Add order assertion + PENDING-not-success assertion |
| `.../verify/HashOnlyCard.tsx` | Modify | Delete `isErrorVerdict`; verdict-title color uses shared table's severity color (success/pending/error); `documentIntegrity`/`anchored` badges unchanged |
| `.../verify/HashOnlyCard.test.tsx` | Modify | Add PENDING_ANCHOR case: verdict title is not `text-success`; error/VALID cases still `text-destructive`/`text-success` |
| `.../landing/Hero.tsx` | Modify | Remove `<p>{t.ctaMicrocopy}</p>` (~line 60) |
| `apps/web/dictionaries/es/landing.ts` | Modify | Remove `hero.ctaMicrocopy` key |
| `dictionaries.test.ts` | No change (verified) | Generic `collectLeafValues(hero)` — no key reference to break |
| `apps/web/app/globals.css` | Modify | Add `--warning*` to `:root`/`.dark` + `@theme inline` |

## Interfaces / Contracts

```ts
// apps/web/lib/verify/verdict.ts
export type VerdictSeverity = "success" | "pending" | "error";

export function classifyVerdict(verdict: VerifyVerdict): VerdictSeverity {
  switch (verdict) {
    case "VALID": return "success";
    case "PENDING_ANCHOR": return "pending";
    case "ASSET_MISMATCH":
    case "INVALID_RECORD": return "error";
  }
}

export const VERDICT_SEVERITY_STYLES: Record<
  VerdictSeverity,
  { className: string; Icon: LucideIcon; role: "status" | "alert" }
> = { /* see table below */ };
```

| Verdict | Severity | Classes | Icon | Role |
|---|---|---|---|---|
| `VALID` | success | `bg-success/10 text-success` | `Check` | `status` |
| `PENDING_ANCHOR` | pending | `bg-warning/10 text-warning` | `Clock` | `status` |
| `ASSET_MISMATCH` | error | `bg-destructive/10 text-destructive` | `ShieldAlert` | `alert` |
| `INVALID_RECORD` | error | `bg-destructive/10 text-destructive` | `ShieldAlert` | `alert` |

### `--warning` token (mirrors `--success` wiring exactly)

`@theme inline` (after `--color-success*`):

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

`:root` (after `--success-foreground`):

```css
--warning: oklch(0.5 0.15 75);            /* ≈ #935200, 6.1:1 vs white */
--warning-foreground: oklch(0.985 0 0);   /* same as --success-foreground */
```

`.dark` (after `--success-foreground`):

```css
--warning: oklch(0.82 0.165 84);          /* ≈ #f6b915, ~11:1 vs dark bg */
--warning-foreground: oklch(0.18 0.02 84);
```

Values computed via oklch↔sRGB WCAG contrast (same method as `--success`,
not eyeballed): light `--warning` is 6.12:1 vs white (`--success` is
7.05:1); dark `--warning` is ~11:1 vs the dark surface (`--success` is
8.38:1). Dark-mode hue/chroma (H84, C0.165) matches the deck's `#fbbf24`
(H84.4, C0.164); light mode is darkened (H75, lower L) because `#fbbf24`
itself is only 1.67:1 vs white — unusable as text/icon color.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `classifyVerdict`: 4 verdicts → 3 severities | New `verdict.test.ts`, no DOM |
| Component | `UploadVerdictPanel`: PENDING_ANCHOR is `status`, renders `Clock`, no `Check`/`bg-success` | Extend `UploadVerdictPanel.test.tsx`; existing cases stay green |
| Component | `VerificationDemo`: button order is semaphore order; PENDING_ANCHOR shows no `Check`/success class | Extend `VerificationDemo.test.tsx`; existing PENDING `status` assertion (line 57) kept |
| Component | `HashOnlyCard`: PENDING_ANCHOR verdict title is not `text-success` (nor `text-destructive`); VALID/error cases unchanged | Extend `HashOnlyCard.test.tsx` with a mocked GET response, per existing MSW precedent |
| Regression | `dictionaries.test.ts` passes post `ctaMicrocopy` removal | No new test — confirmed no hardcoded reference exists |
| strict_tdd | Above test edits are written and red before touching implementation | Enforced in `sdd-tasks`/`sdd-apply` ordering |

## Migration / Rollout

No migration required. Single-package (`apps/web`) CSS-token + component
change; `git revert` is sufficient rollback.

## Open Questions

- [ ] Should the `Light-Mode-Only Styling` rewrite happen in this change's
      archive step, or as a separate doc-only follow-up? Recommendation:
      do it here, since this change is what makes the drift undeniable —
      flagging for explicit confirmation before archive.
