# Tasks: Dark Mode Toggle for apps/web

> **Note**: The concrete `.dark` navy oklch values and `--success` values below
> are the design.md proposal. They are **approved-pending-user-preview** — show
> the rendered navy/success surfaces at the apply checkpoint before treating
> Phase 1 as final; adjust hue/chroma numbers only if the user requests it,
> keep `--primary` (hue 264) and border/input alpha values locked either way.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380–460 (9 phases, 1 new file, 1 new component+test, 9 modified files, 7 emerald-refactor files, 2 doc-index edits) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No — cohesive single feature, each phase is small; splitting would fragment the FOUC/hydration guarantee across PRs |
| Suggested split | Single PR (all phases) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full dark-mode toggle (Phases 1–9) | PR 1 | Base: main. Cohesive vertical slice (tokens + helper + SSR + component + wiring + refactor) below the 400-line risk threshold if scoped tightly; ask user to confirm single-PR before apply given "Medium" risk |

## Phase 1: Tokens (`app/globals.css`)

- [x] 1.1 Add `--success: oklch(0.45 0.1 162)` and `--success-foreground: oklch(0.985 0 0)` to `:root`.
- [x] 1.2 Add `--success: oklch(0.72 0.16 158)` and `--success-foreground: oklch(0.16 0.02 158)` to `.dark`.
- [x] 1.3 Re-tune `.dark` navy values per design.md table: `--background`, `--foreground`, `--card`/`--popover`(+foreground), `--secondary`, `--muted`(+foreground), `--accent`/`--sidebar-accent`, `--sidebar`. Leave `--primary`, `--ring`, `--sidebar-primary`, `--chart-*`, `--border`/`--input`/`--sidebar-border` untouched.
- [x] 1.4 Add `--color-success: var(--success);` and `--color-success-foreground: var(--success-foreground);` to the `@theme inline` block.
- [x] 1.5 Manual check: grep `globals.css` confirms `--success` appears exactly twice (`:root`, `.dark`) and `--primary` hue `264` is unchanged in both blocks.

## Phase 2: Isomorphic Theme Helper (`apps/web/lib/theme.ts`)

- [x] 2.1 RED — create `apps/web/lib/theme.test.ts` (mirrors `lib/session.test.ts` style, no `next/headers` mocking needed since the module is isomorphic): failing assertions for `parseThemePreference` (returns `"light"|"dark"|"system"` for valid input, defaults to `"system"` for `undefined`/invalid), `resolveServerHtmlClassName` (`"dark"` only for `"dark"` input, `""` for `"light"`/`"system"`), and `buildThemeInitScript` (returns a non-empty string containing `matchMedia` and `document.cookie`/`classList`).
- [x] 2.2 GREEN — create `apps/web/lib/theme.ts` exporting `ThemePreference`, `THEME_COOKIE_NAME`, `THEME_COOKIE_MAX_AGE_SECONDS`, `parseThemePreference`, `resolveServerHtmlClassName`, `buildThemeInitScript` per design.md's Interfaces section. No `next/headers` import.
- [x] 2.3 GREEN — add `buildThemeCookieOptions()` (mirrors `buildSessionCookieOptions`) returning `{ httpOnly: false, sameSite: "lax", path: "/", maxAge: THEME_COOKIE_MAX_AGE_SECONDS }`; extend 2.1's test file with a RED case first, then implement.
- [x] 2.4 Run `pnpm --filter @trustai/web test theme` — confirm all Phase 2 tests pass.

## Phase 3: SSR Wiring (`app/layout.tsx`)

- [x] 3.1 RED — extend `apps/web/app/layout.test.tsx`: mock `next/headers` `cookies()` (pattern from `lib/session.test.ts`) returning `theme=dark`; assert the rendered `<html>` element (via `await RootLayout({children})` + inspect the returned element's `className`) includes `"dark"`. Add a second case for `theme=light` → no `"dark"` class. Both fail (RootLayout isn't async / doesn't read the cookie yet).
- [x] 3.2 GREEN — make `RootLayout` `async`; `await cookies()`, read `theme` via `parseThemePreference`, append `resolveServerHtmlClassName(pref)` to the `<html>` `className`; add `suppressHydrationWarning` on `<html>`.
- [x] 3.3 GREEN — inject the blocking script: add `<script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />` as the first child of `<head>` (Next.js App Router allows a `<head>` element returned from a Server Component layout — verify against `node_modules/next/dist/docs/` per this repo's Next.js version note before wiring, since API may differ from trained knowledge).
- [x] 3.4 Run `pnpm --filter @trustai/web test layout` — confirm Phase 3 tests pass; confirm no other `layout.test.tsx` regressed from the `async` change.

## Phase 4: Dictionary (`dictionaries/es/shell.ts`)

- [x] 4.1 RED — add a dedicated assertion block to `apps/web/dictionaries/es/dictionaries.test.ts`: `shellDictionary.theme` has non-empty string keys `groupLabel`, `light`, `dark`, `system`. Fails (key doesn't exist).
- [x] 4.2 GREEN — add `theme: { groupLabel, light, dark, system }` to `shellDictionary` in `dictionaries/es/shell.ts` with neutral/professional Spanish copy (RNF-041).
- [x] 4.3 Run `pnpm --filter @trustai/web test dictionaries` — confirm pass, including the existing leaf-value sweep.

## Phase 5: ThemeToggle Component (`components/shell/ThemeToggle.tsx`)

- [x] 5.1 RED — create `apps/web/components/shell/ThemeToggle.test.tsx`: renders 3 `role="button"` (via `Button` `asChild`-free) with `aria-pressed` — `initialPreference="dark"` prop renders the Dark button `aria-pressed="true"`, others `"false"`; accessible names equal `shellDictionary.theme.{light,dark,system}`. All fail (component doesn't exist).
- [x] 5.2 RED — extend 5.1's file: clicking the Light button sets `document.cookie` to start with `theme=light`, adds/removes `document.documentElement.classList` `"dark"` accordingly (jsdom `document.cookie` is writable per-test — reset in `afterEach`).
- [x] 5.3 RED — extend 5.1's file: keyboard activation (Enter/Space on a focused button — native `<button>` semantics, use `fireEvent.keyDown`/`userEvent.click` per existing RTL conventions in this repo) activates the option same as click.
- [x] 5.4 GREEN — create `apps/web/components/shell/ThemeToggle.tsx`: `"use client"`; props `{ initialPreference: ThemePreference }`; internal state seeded from the prop (no `useEffect`-gated mount guard per design.md decision #2); `role="group"` wrapping 3 ghost `Button size="icon-sm"` (`Sun`/`Moon`/`Monitor` from `lucide-react` — confirm import path matches existing icon usage in the repo, e.g. `components/history/StateBadge.tsx` or similar); `aria-pressed` per button; `onClick` writes `document.cookie` via `buildThemeCookieOptions()`-derived string and toggles `documentElement.classList`.
- [x] 5.5 RED — extend 5.1's file: while `preference === "system"`, a `matchMedia("(prefers-color-scheme: dark)")` change event (mock `window.matchMedia` per common RTL pattern) toggles `.dark` live without re-render of the toggle's own pressed state changing away from "system".
- [x] 5.6 GREEN — implement the `matchMedia` listener in `ThemeToggle` (attach only when `preference === "system"`; clean up on unmount/preference change per design.md's sequence diagram note).
- [x] 5.7 Run `pnpm --filter @trustai/web test ThemeToggle` — confirm all Phase 5 tests pass.

**Deviation**: jsdom does not implement `window.matchMedia` at all (not even a stub). Added a default no-op polyfill to `vitest-setup.ts` (guarded by `typeof window.matchMedia !== "function"`) so any test rendering `ThemeToggle` with `initialPreference="system"` doesn't crash; the matchMedia-behavior test still overrides it per-test via `vi.stubGlobal`. Not explicitly called out in design.md but required for the design's own testing strategy to be executable.

## Phase 6: Placement (Shell + Landing Nav)

- [x] 6.1 RED — extend `apps/web/app/(dashboard)/layout.test.tsx` (create if absent, mirroring `lib/session.test.ts`'s `next/headers` mock pattern): mock `cookies()` to return a `theme` cookie; assert `ThemeToggle` renders in the header with the expected `initialPreference`. Fails.
- [x] 6.2 GREEN — in `app/(dashboard)/layout.tsx`: `await cookies()`, `parseThemePreference`, mount `<ThemeToggle initialPreference={pref} />` in the header nav next to `LogoutButton`.
- [x] 6.3 RED — extend `apps/web/components/landing/Nav.test.tsx`: mock `next/headers` `cookies()`; since `Nav` becomes `async`, render via `render(await Nav())` (Server Component test pattern — confirm this resolves correctly under this repo's Next.js/Vitest setup, adjusting the render call if the docs specify a different async-Server-Component test approach); assert `ThemeToggle` renders with the expected `initialPreference`. Fails.
- [x] 6.4 GREEN — make `Nav` `async`; `await cookies()`, `parseThemePreference`, mount `<ThemeToggle initialPreference={pref} />` in the nav's action group.
- [x] 6.5 Run `pnpm --filter @trustai/web test` (dashboard + Nav suites) — confirm no regression in the existing Nav assertions (section links, login/register hrefs).

**Deviations (flagged — design.md/tasks.md gap)**:
1. `app/page.test.tsx`'s existing composition-order test rendered `<LandingPage />` via `@testing-library/react`'s client `render()`, which cannot resolve `Nav` now that it's an async Server Component (only the real Next.js RSC renderer can). Fixed by mocking `Nav` in `page.test.tsx`, mirroring the pre-existing `VerificationDemo` mock in the same file (same rationale: that suite tests ORDERING, not `Nav`'s internals, which are already covered by `Nav.test.tsx`).
2. Spec.md's Scenario ("Toggle renders in shell and public nav") explicitly names `/verify/[id]` as a surface requiring the toggle, but design.md's "File Changes" table and this Phase 6 task list only listed `(dashboard)/layout.tsx` and `landing/Nav.tsx` — `app/verify/[id]/layout.tsx` (the persistent header for the public verify page, per ADR/Decision 7) was missing. Added `ThemeToggle` to both its authenticated and public nav branches (minimal consistent choice: the toggle is always present on that page regardless of auth state, matching the "No-Auth Access" invariant) and extended `verify/[id]/layout.test.tsx` accordingly.

## Phase 7: Success Token Refactor (12 sites, 7 files)

- [x] 7.1 RED — for each of the 7 files below, if an existing test asserts a literal `emerald-*` class, update that assertion first to expect `success`-token classes (fails until 7.2 lands); if no test currently pins the class name, skip straight to 7.2 for that file. (Confirmed via grep: no test in the repo pins a literal `emerald-*` class — skipped straight to GREEN for all 7 files.)
- [x] 7.2 GREEN — `components/verify/HashOnlyCard.tsx`: lines 46/67 `bg-emerald-50 text-emerald-600` → `bg-success/10 text-success`; line 56 `text-emerald-600` → `text-success`.
- [x] 7.3 GREEN — `components/verify/UploadVerdictPanel.tsx` line 188: `bg-emerald-50 text-emerald-600` → `bg-success/10 text-success`.
- [x] 7.4 GREEN — `components/history/StateBadge.tsx` line 26: `bg-emerald-50 text-emerald-600` → `bg-success/10 text-success`; update the doc comment above it (line ~15) referencing "emerald recipe".
- [x] 7.5 GREEN — `components/landing/Hero.tsx`: line 31 `bg-emerald-500` → `bg-success`; lines 65/118 `text-emerald-600` → `text-success`; line 82 `bg-emerald-50 text-emerald-600` → `bg-success/10 text-success`.
- [x] 7.6 GREEN — `app/verify/[id]/page.tsx` line 57: `bg-emerald-500` → `bg-success`.
- [x] 7.7 GREEN — `components/ui/status-panel.tsx` line 20: `bg-emerald-50 ... text-emerald-600` → `bg-success/10 ... text-success`.
- [x] 7.8 GREEN — `components/landing/VerificationDemo.tsx` line 88: `bg-emerald-50 text-emerald-600` → `bg-success/10 text-success`.
- [x] 7.9 Verify — `rg emerald apps/web/components apps/web/app` returns zero matches (confirms all 12 sites across the 7 files are cleared).
- [x] 7.10 Run `pnpm --filter @trustai/web test` — confirm no regressed assertions in HashOnlyCard/UploadVerdictPanel/StateBadge/Hero/status-panel/VerificationDemo/verify-page test suites.

## Phase 8: ADR Indexing + Stale Config Note

- [x] 8.1 Verify `docs/adr/ADR-011-cookie-server-component-theming-sobre-next-themes.md` exists and is complete (already written per design.md — read-only check, no edit expected).
- [x] 8.2 Add the ADR-011 row to `docs/architecture/decisions.md`'s decision table (same format as the existing ADR-010 row).
- [x] 8.3 Add the ADR-011 row to `docs/README.md`'s ADR table (same format as the existing ADR-010 row).
- [x] 8.4 Update `openspec/config.yaml`'s `context:` block — remove/replace the stale "apps/web is light-mode only — no dark-mode toggle." sentence to reflect the shipped toggle.

## Phase 9: Full Gate

- [x] 9.1 Run `pnpm --filter @trustai/web test` — full web unit suite green, no regressions. (61 files / 318 tests passed.)
- [x] 9.2 Run `pnpm --filter @trustai/web lint`. (0 errors; 1 pre-existing warning in generated `coverage/block-navigation.js`, unrelated to this change.)
- [x] 9.3 Run `pnpm --filter @trustai/web typecheck`. (Clean, no errors.)
- [x] 9.4 Run `pnpm --filter @trustai/web build` — confirm the blocking script and `async` layout/Nav changes build cleanly under Next.js App Router. (Build succeeded. **Consequence to flag**: every route is now marked `ƒ (Dynamic)` in the build output, including `/` — reading `cookies()` in `app/layout.tsx` and `components/landing/Nav.tsx` opts the whole app out of static generation, per `node_modules/next/dist/docs/.../cookies.md`'s "Good to know". This is an inherent, correct consequence of the cookie+SSR approach ADR-011 already chose, but design.md/tasks.md didn't call out the static→dynamic rendering-strategy shift explicitly — flagging for `sdd-verify` to confirm it's an accepted tradeoff.)
- [x] 9.5 Run `pnpm -r test` — confirm zero regressions workspace-wide. (Exit 0: `packages/utils` 11/11, `packages/dtr-core` 29/29, `apps/api` 205/206 passed + 1 pre-existing skipped, `apps/web` 318/318. All green.)
- [x] 9.6 Note for verify phase: manual/DevTools WCAG-AA contrast pass on navy `--background`/`--card` for `--foreground`/`--primary`/`--success`, plus visual QA across landing, auth, certify wizard, dtr list/detail, public verify, error/not-found, QuickHelp (proposal.md's dark-mode QA scope) — **not** executable as an automated unit test, deferred to `sdd-verify`. (Recorded here for the verify agent — no action taken by apply.)
