# Spec: web-theme

## Requirements

### Requirement: Theme Toggle Control

The system MUST render a toggle offering `light`/`dark`/`system` in the
authenticated shell nav and the public landing/verify nav. Its accessible
name MUST come from a dictionary key (`shellDictionary.theme.*`,
`landingDictionary.nav.theme*`) per RNF-041 — never literal copy. It MUST
be operable by keyboard (focus + Enter/Space or arrow keys) and by tap.

#### Scenario: Toggle renders in shell and public nav

- GIVEN a signed-in user on `(dashboard)`, or a visitor on `/`/`/verify/[id]`
- WHEN that nav renders
- THEN a light/dark/system toggle is present

#### Scenario: Toggle is keyboard operable with a dictionary-sourced name

- GIVEN the toggle has focus
- WHEN the user presses Enter/Space (or arrow keys)
- THEN the option activates and its accessible name is a dictionary value

### Requirement: Theme Persistence via Cookie

Selecting `light`/`dark`/`system` MUST persist across reload and
client-side navigation via a `theme` cookie written by the toggle.

#### Scenario: Persists across reload and navigation

- GIVEN the user selects `dark` on `/`
- WHEN the page reloads, or the user navigates to `/dtrs`
- THEN the `theme` cookie reads `dark` and dark stays applied with no flash

### Requirement: SSR Renders Correct Theme Class (No FOUC)

`app/layout.tsx` MUST read the `theme` cookie via `next/headers` and render
`<html>` with the resolved class before hydration — no flash of the wrong
theme, no hydration mismatch warning.

#### Scenario: Server renders the class from the cookie with no mismatch

- GIVEN a request with `theme=dark`
- WHEN `app/layout.tsx` renders server-side and the client hydrates
- THEN the initial HTML's `<html>` already carries the dark class, and no
  hydration mismatch warning is emitted

### Requirement: System Theme Follows OS Preference

When `system` is selected, a blocking pre-hydration script MUST resolve
`prefers-color-scheme` before first paint, and the theme MUST react to
runtime OS changes while `system` remains active.

#### Scenario: Resolves OS preference before first paint

- GIVEN `theme=system` and the OS reports `dark`
- WHEN the page loads
- THEN dark applies before first paint, no flash of light

#### Scenario: Runtime OS change updates the theme

- GIVEN `system` is active on an open page
- WHEN the OS preference flips to `dark`
- THEN the applied theme updates without a reload

### Requirement: Token-Driven Theming Contract

All themeable colors MUST derive from the semantic custom properties in
`app/globals.css` (`--background`, `--card`, `--primary`, `--border`,
`--muted-foreground`, etc.) under `:root`/`.dark`. Components MUST NOT
hardcode raw colors for themeable surfaces. `--primary` hue MUST stay
`264` (indigo) in both themes — no azure substitution.

#### Scenario: Surfaces use variables; primary hue unchanged

- GIVEN a themeable surface under `.dark`, and `--primary` in `:root`/`.dark`
- WHEN colors are inspected
- THEN the surface resolves via a custom property (no literal), and both
  `--primary` hues equal `264`

### Requirement: Dark Surface Mood and Contrast

`.dark` background/card MUST use non-zero chroma at hue ~264 (navy, not
neutral black); borders MUST use white at low alpha. Foreground/primary/
success contrast on dark surfaces MUST meet WCAG AA (>= 4.5:1 text,
>= 3:1 large text/UI).

#### Scenario: Dark surfaces are navy with AA contrast

- GIVEN `--background`/`--card` under `.dark`, and foreground/primary/
  success rendered on them
- WHEN chroma and contrast are inspected
- THEN chroma > 0 at hue ~264, text contrast >= 4.5:1, large text/UI >= 3:1

### Requirement: Semantic Success Token

A `--success`/`--success-foreground` token MUST exist in `:root`/`.dark`.
"Verified"/"anchored" states MUST use it, not hardcoded `emerald-*`
utilities.

#### Scenario: Success state uses the token, not emerald-*

- GIVEN a DTR reaches `CERTIFIED` or an anchor confirms
- WHEN the success indicator renders
- THEN it resolves via `--success`/`--success-foreground`, not `emerald-*`

#### Scenario: Success token meets WCAG AA in both themes

- GIVEN `--success` against its paired surface in `:root` and `.dark`
- WHEN contrast is computed
- THEN it meets >= 4.5:1 (text) or >= 3:1 (large text/UI)

### Requirement: Semantic Warning Token

A `--warning`/`--warning-foreground` token pair MUST exist in `:root`/
`.dark`, following the same pattern as `--success`/`--success-foreground`.
Pending/in-progress states (e.g. the `PENDING_ANCHOR` verdict) MUST use it,
not hardcoded amber/yellow Tailwind utilities. The pair MUST meet WCAG AA
contrast in both themes, mirroring `--success`'s pattern. Exact oklch
values are a design-phase decision, informed by the presentation deck's
amber tone (`#fbbf24`-adjacent).

#### Scenario: Pending state uses the token, not hardcoded amber

- GIVEN a verdict outcome renders `PENDING_ANCHOR`'s pending severity
- WHEN colors are inspected
- THEN it resolves via `--warning`/`--warning-foreground`, not a literal or
  hardcoded amber/yellow value

#### Scenario: Warning token meets WCAG AA in both themes

- GIVEN `--warning` against its paired surface in `:root` and `.dark`
- WHEN contrast is computed
- THEN it meets >= 4.5:1 (text) or >= 3:1 (large text/UI)
