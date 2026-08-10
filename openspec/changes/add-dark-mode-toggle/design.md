# Design: Dark Mode Toggle for apps/web

## Technical Approach

Cookie (`theme=light|dark|system`) + Server Component read in
`app/layout.tsx` render the correct `<html class="dark">` (or not) before
hydration. A blocking inline `<head>` script resolves `system`/missing-cookie
via `prefers-color-scheme` pre-paint. A client `ThemeToggle` (3 buttons, no
new radix primitive) writes the cookie and mutates
`document.documentElement.classList` directly — no `router.refresh()`, no
`next-themes`. `.dark` tokens shift from neutral black to navy at hue 264;
`--primary` (indigo, hue 264) is untouched in both themes. A new
`--success`/`--success-foreground` pair replaces ~12 hardcoded `emerald-*`
sites.

## Architecture Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|--------------------------|-----------|
| 1 | Toggle mechanism | 3 independent `<button aria-pressed>` in a `role="group"` (Sun/Moon/Monitor icons, `size="icon-sm"` ghost `Button`) | (a) Single cycle button light→dark→system; (b) full ARIA `radiogroup`/`radio` w/ roving tabindex + arrow keys | (a) hides 2 of 3 options at any time — weaker fit for the spec's "a light/dark/system toggle **is present**" wording, which reads as all 3 being visible. (b) is more "correct" per WAI-ARIA APG but needs custom roving-tabindex + arrow-key handling for a11y gain the spec doesn't require (`spec.md` accepts "Enter/Space **or** arrow keys" — Enter/Space is enough). Native `<button>` × 3 gets Tab/Enter/Space for free from the existing `Button` primitive, zero custom key handling, smallest test surface |
| 2 | "System" button icon | Static `Monitor` icon, never swapped for a resolved sun/moon | Dynamic icon reflecting resolved OS theme | The 3 buttons' `aria-pressed` state is 100% SSR-derivable from the cookie (default `"system"` when absent) — **no client-only state, no mounted-guard, no hydration-mismatch risk** in `ThemeToggle` itself. A resolved-state icon would need a `useEffect`-gated guard (next-themes' `resolvedTheme` pattern) for a cosmetic gain only; deferred (Open Questions) |
| 3 | Cookie vs `next-themes` | Cookie + Server Component (locked direction) | `next-themes` (client-only, `localStorage`/cookie + `suppressHydrationWarning`) | Real tradeoff — **ADR-011 proposed** (see below) |
| 4 | Dictionary ownership | Landing reuses `shellDictionary.theme` | `landingDictionary.nav.theme*` (spec.md's parenthetical guess) | `shell.ts`'s own doc comment scopes it as "shared across routes"; one copy avoids drift between shell/landing wording (resolves the spec's flagged ambiguity) |

## Sequence: First Load + Toggle

```
Browser                    layout.tsx (RSC)         Inline <head> script      ThemeToggle (client)
  │ GET / (Cookie: theme=system, or none)                                        │
  │───────────────────────▶│                                                     │
  │                        │ cookies().get("theme") → parseThemePreference()     │
  │                        │  "dark"   → <html class="dark">                    │
  │                        │  "light"  → <html> (no class)                      │
  │                        │  "system" → <html> (no class, NEUTRAL — see §4)    │
  │◀── HTML (suppressHydrationWarning on <html>) + inline script ───────────────│
  │ parses <head>, runs script BEFORE first paint                               │
  │                        │                          reads document.cookie      │
  │                        │                          "dark" or ("system" &&    │
  │                        │                          matchMedia dark) → adds   │
  │                        │                          .dark class NOW           │
  │◀── first paint: correct theme, no FOUC ──────────────────────────────────────│
  │ React hydrates: <html> DOM already matches what the script produced;        │
  │ suppressHydrationWarning silences the one attribute React doesn't own here  │
  │                        │                                                     │             │
  │ user clicks "Dark" ─────────────────────────────────────────────────────────────────────▶│
  │                        │                                                     │ setPreference("dark")
  │                        │                                                     │ document.cookie = "theme=dark;..."
  │                        │                                                     │ classList.add("dark") — instant, no reload
  │ user reloads / navigates to /dtrs (full request) ────────────────────────────│
  │───────────────────────▶│ cookies().get("theme") === "dark" → <html class="dark"> (matches already-applied class, no flash)
```

For active `system`: `ThemeToggle` attaches a `matchMedia("(prefers-color-scheme: dark)").addEventListener("change", …)` while `preference === "system"`, toggling the class live, cleaned up on unmount/preference change (satisfies "Runtime OS change updates the theme").

## No-FOUC / No-Mismatch Reconciliation (Requirement #4)

- `<html suppressHydrationWarning>` in `layout.tsx` — the officially-documented escape hatch for a pre-hydration script mutating an attribute React renders (same technique `next-themes` relies on).
- Explicit `"dark"` cookie ⇒ SSR renders the class directly ⇒ script is a no-op ⇒ **zero mismatch by construction**.
- `"system"`/missing cookie ⇒ SSR deliberately renders **without** guessing (can't know OS preference server-side) ⇒ script corrects the DOM class synchronously before paint, **before** React hydrates ⇒ `suppressHydrationWarning` prevents the (harmless, already-resolved) warning React would otherwise log for that one attribute.

## Cookie Contract

| Attribute | Value |
|---|---|
| Name | `theme` |
| Values | `light` \| `dark` \| `system` |
| `httpOnly` | `false` (client must read/write) |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | `31536000` (1 year) |

Client writes via `document.cookie = "theme=<v>; Path=/; Max-Age=31536000; SameSite=Lax"`. Server reads via `(await cookies()).get("theme")?.value` (same async pattern as `lib/session.ts`).

## Interfaces

`apps/web/lib/theme.ts` (isomorphic — **no** `next/headers` import, so `ThemeToggle` can import it too):

```ts
export type ThemePreference = "light" | "dark" | "system";
export const THEME_COOKIE_NAME = "theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export function parseThemePreference(raw: string | undefined): ThemePreference;
export function resolveServerHtmlClassName(pref: ThemePreference): string; // "dark" | ""
export function buildThemeInitScript(): string; // pre-paint script body
```

Extracting pure functions here (mirrors `buildSessionCookieOptions` in `lib/session.ts`) makes the SSR mapping unit-testable with zero `next/headers` mocking.

`ThemeToggle` props: `{ initialPreference: ThemePreference }` (SSR-supplied, avoids any client-only default flash of the pressed state).

## `.dark` Navy Re-tune (hue 264, `--primary` unchanged)

| Token | Old | New | Note |
|---|---|---|---|
| `--background` | `oklch(0.145 0 0)` | `oklch(0.16 0.02 264)` | |
| `--foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0.002 264)` | |
| `--card` / `--popover` | `oklch(0.205 0 0)` | `oklch(0.22 0.025 264)` | |
| `--card-foreground` / `--popover-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0.002 264)` | |
| `--secondary` | `oklch(0.27 0.03 264)` | `oklch(0.26 0.035 264)` | |
| `--muted` | `oklch(0.27 0.02 264)` | `oklch(0.25 0.03 264)` | |
| `--muted-foreground` | `oklch(0.708 0.02 264)` | `oklch(0.72 0.025 264)` | |
| `--accent` / `--sidebar-accent` | `oklch(0.3 0.05 264)` | `oklch(0.32 0.06 264)` | |
| `--sidebar` | `oklch(0.205 0.01 264)` | `oklch(0.2 0.03 264)` | |
| `--border` / `--input` / `--sidebar-border` | unchanged | unchanged | already white-alpha, spec-compliant |
| `--primary`, `--ring`, `--sidebar-primary`, `--chart-*` | unchanged | unchanged | **locked** |

Computed contrast (OKLab→linear-sRGB→WCAG relative luminance): `--foreground` on new `--background` ≈ **18.6:1**; `--primary` on new `--background` ≈ **5.17:1** (passes both 4.5:1 text and 3:1 UI). Verify phase re-checks with actual tooling.

## `--success` Token

| | `:root` | `.dark` |
|---|---|---|
| `--success` | `oklch(0.45 0.1 162)` | `oklch(0.72 0.16 158)` |
| `--success-foreground` | `oklch(0.985 0 0)` | `oklch(0.16 0.02 158)` |

Computed contrast: light `--success` on white ≈ **7.04:1**; dark `--success` on new dark `--background` ≈ **8.39:1**. Both clear AA text (4.5:1). `@theme inline` addition:

```css
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
```

## Emerald → `--success` Refactor Map (12 sites, 7 files — corrects proposal's `app/page.tsx` to the actual `app/verify/[id]/page.tsx`, and `StateBadge` count 1→ actual, total 13→12)

| File | Line(s) | From | To |
|---|---|---|---|
| `components/verify/HashOnlyCard.tsx` | 46, 67 | `bg-emerald-50 text-emerald-600` | `bg-success/10 text-success` |
| `components/verify/HashOnlyCard.tsx` | 56 | `text-emerald-600` | `text-success` |
| `components/verify/UploadVerdictPanel.tsx` | 188 | `bg-emerald-50 text-emerald-600` | `bg-success/10 text-success` |
| `components/history/StateBadge.tsx` | 26 | `bg-emerald-50 text-emerald-600` | `bg-success/10 text-success` |
| `components/landing/Hero.tsx` | 31 | `bg-emerald-500` | `bg-success` |
| `components/landing/Hero.tsx` | 65, 118 | `text-emerald-600` | `text-success` |
| `components/landing/Hero.tsx` | 82 | `bg-emerald-50 text-emerald-600` | `bg-success/10 text-success` |
| `app/verify/[id]/page.tsx` | 57 | `bg-emerald-500` | `bg-success` |
| `components/ui/status-panel.tsx` | 20 | `bg-emerald-50 ... text-emerald-600` | `bg-success/10 ... text-success` |
| `components/landing/VerificationDemo.tsx` | 88 | `bg-emerald-50 text-emerald-600` | `bg-success/10 text-success` |

## File Changes

| File | Action |
|---|---|
| `apps/web/lib/theme.ts` | New — isomorphic types/constants/pure functions |
| `apps/web/app/globals.css` | Modify — navy `.dark`, `--success`, `@theme inline` mapping |
| `apps/web/app/layout.tsx` | Modify — cookie read, `suppressHydrationWarning`, `<head><script>` |
| `apps/web/components/shell/ThemeToggle.tsx` (+`.test.tsx`) | New |
| `apps/web/app/(dashboard)/layout.tsx` | Modify — mount `ThemeToggle` |
| `apps/web/components/landing/Nav.tsx` (+ update `Nav.test.tsx`) | Modify — mount `ThemeToggle` |
| `apps/web/dictionaries/es/shell.ts` | Modify — add `theme: { groupLabel, light, dark, system }` |
| 7 files in refactor map above | Modify — emerald → `--success` |

## Testing Strategy (strict_tdd)

| Layer | What | Approach |
|---|---|---|
| Unit | `parseThemePreference`, `resolveServerHtmlClassName`, `buildThemeInitScript` | Vitest, no mocking (mirrors `buildSessionCookieOptions`) |
| Unit/RTL | `ThemeToggle`: renders 3 buttons w/ `shellDictionary.theme.*` accessible names; click/Enter/Space cycles `aria-pressed`; writes `document.cookie`; toggles `documentElement.classList` | Vitest + Testing Library |
| Dictionary | `shellDictionary.theme` keys present, non-empty (existing `dictionaries.test.ts` leaf-value sweep already covers this) | Extend `dictionaries.test.ts` if a dedicated assertion is wanted |
| Integration | `Nav.test.tsx` / dashboard layout: `ThemeToggle` present with correct `initialPreference` from a mocked cookie | Vitest, mock `next/headers` `cookies()` |
| Manual/verify | WCAG AA contrast on navy `--background`/`--card` for `--foreground`/`--primary`/`--success` | Verify phase (scripted or DevTools) |

## Migration / Rollout

No data migration. Pure CSS + one cookie + isolated components (proposal's rollback plan holds).

## ADR Recommendation

**Yes — propose ADR-011**: "Cookie + Server Component theming over `next-themes` (SSR no-FOUC)". Next available number after ADR-010 (`docs/adr/ADR-010-...md`). Rationale: real tradeoff (zero new dependency + full SSR control vs. `next-themes`' simpler API but client-only resolution + its own `suppressHydrationWarning` requirement + an extra dependency for ~40 lines of logic this design already needs to hand-roll for the cookie anyway).

## Open Questions

- [ ] Should the `system` button later show a resolved sun/moon icon (needs a mounted-guard)? Deferred — no spec requirement forces it.
