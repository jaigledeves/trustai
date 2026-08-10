# Proposal: Dark Mode Toggle for apps/web

## Intent

`apps/web` ships a full shadcn `.dark {}` token block but no toggle wires
it up. The TFM deck's navy dark mood should replace the current
neutral-black surfaces, and hardcoded emerald "verified" utilities need a
semantic token to theme correctly once dark mode is live.

### In Scope

- Client theme toggle (light/dark/system) in app shell nav + landing nav.
- `theme` cookie read by `app/layout.tsx` (Server Component) to render
  `<html class="dark">` — no FOUC, no next-themes.
- Blocking inline script honoring `system`/`prefers-color-scheme` pre-paint.
- Re-tune `.dark` token VALUES: neutral black → slight navy chroma at hue
  ~264; keep white-alpha borders and indigo `--primary` unchanged.
- Add semantic `--success` token (light + dark); refactor ~13 hardcoded
  `emerald-*` usages (HashOnlyCard, Hero, app/page, StateBadge,
  ui/status-panel, UploadVerdictPanel, VerificationDemo).
- Dark-mode QA: landing, auth, certify wizard, dtr list/detail, public
  verify, error/not-found, QuickHelp.

### Out of Scope

- Changing the light-theme indigo primary or adopting the deck's azure.
- Per-component visual redesign beyond token-driven theming.
- Adding `next-themes`.

## Capabilities

### New Capabilities

- `web-theme`: toggle affordance, cookie persistence, no-FOUC SSR rule, and
  the `.dark` token / `--success` theming contract.

### Modified Capabilities

None — `web-visual-coherence`'s success/error requirement stays satisfied
(still renders emerald); only the implementation moves to a CSS variable.

## Approach

`layout.tsx` reads the `theme` cookie via `next/headers`, setting
`class="dark"` on `<html>` before first paint. A client toggle writes the
cookie and toggles the class. An inline `<head>` script resolves `system`
via `matchMedia` pre-hydration. Token/`--success` changes are pure CSS.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `app/globals.css` | Modified | Navy `.dark` tokens, new `--success` |
| `app/layout.tsx` | Modified | Cookie read, `class="dark"`, inline script |
| Nav components (shell + landing) | Modified | Theme toggle |
| 7 files w/ hardcoded emerald | Modified | Use `--success` token |
| `openspec/config.yaml` | Stale | "light-mode only" note (flag for archive) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|--------------|
| Hydration mismatch | Med | Blocking inline script pre-hydration |
| Contrast regression on navy | Med | WCAG-AA check on primary/success |
| Missed emerald usage | Low | Grep-verified 13-site inventory |

## Rollback Plan

CSS tokens + one cookie + isolated components — revert `globals.css`,
remove the toggle/cookie read in `layout.tsx`, restore literal `emerald-*`
classes. No data migration.

## Dependencies

None. State: web-only (`apps/web`).

## Success Criteria

- [ ] Toggle persists across reloads via `theme` cookie
- [ ] No FOUC and no hydration mismatch in any mode
- [ ] All target routes legible in dark; primary/success meet WCAG-AA
- [ ] Light-theme indigo primary unchanged
