# Verification Report: add-dark-mode-toggle

**Mode**: openspec (filesystem) | **Branch**: `feat/dark-mode-toggle` (uncommitted working tree) | **Date**: 2026-08-10

## 1. Task Completeness

All **48/48** tasks in `tasks.md` are marked `[x]` across 9 phases (Tokens, Theme Helper, SSR Wiring, Dictionary, ThemeToggle, Placement, Success Token Refactor, ADR Indexing, Full Gate). No unchecked tasks. Two apply-time deviations are documented inline in `tasks.md` (Phase 5: jsdom `matchMedia` polyfill; Phase 6: added `ThemeToggle` to `verify/[id]/layout.tsx`, not originally listed in design.md's File Changes table) — both are additive, spec-aligned, and don't contradict any requirement.

## 2. Gate Commands

| Command | Result |
|---|---|
| `pnpm --filter @trustai/web test` | **PASS** — 61 files / 318 tests |
| `pnpm --filter @trustai/web lint` | **PASS** — 0 errors, 1 pre-existing warning (unused eslint-disable in generated `coverage/block-navigation.js`, unrelated to this change) |
| `pnpm --filter @trustai/web typecheck` | **PASS** — clean, 0 errors |
| `pnpm --filter @trustai/web build` | **PASS** — compiled successfully; all 13 routes render `ƒ (Dynamic)` (see §5) |
| `pnpm -r test` (workspace) | **PASS** — `dtr-core` 29/29, `utils` 11/11, `api` 205/206 + 1 pre-existing skip, `web` 318/318 — zero regressions |

## 3. Spec Compliance Matrix (web-theme, 7 requirements)

| Requirement | Implementation | Covering Test(s) | Status |
|---|---|---|---|
| Theme Toggle Control | `ThemeToggle.tsx` (3 `<button role=group>`, `aria-pressed`, dictionary names); mounted in `(dashboard)/layout.tsx`, `landing/Nav.tsx`, `verify/[id]/layout.tsx` | `ThemeToggle.test.tsx` (role/name/aria-pressed, Enter/Space activation); `(dashboard)/layout.test.tsx`; `Nav.test.tsx`; `verify/[id]/layout.test.tsx` | **PASS** |
| Theme Persistence via Cookie | `writeThemeCookie()` in `ThemeToggle.tsx`, `buildThemeCookieOptions()` in `lib/theme.ts` | `ThemeToggle.test.tsx` (`document.cookie` assertions); `lib/theme.test.ts` (`buildThemeCookieOptions`) | **PASS** |
| SSR Renders Correct Theme Class (No FOUC) | `app/layout.tsx` — `await cookies()`, `parseThemePreference`, `resolveServerHtmlClassName`, `suppressHydrationWarning` | `app/layout.test.tsx` (6 tests: mocked `cookies()` → asserts `<html>` className) | **PASS** |
| System Theme Follows OS Preference | `buildThemeInitScript()` (pre-paint) + `ThemeToggle`'s `matchMedia` listener | `lib/theme.test.ts` (script contains `matchMedia`/`classList`); `ThemeToggle.test.tsx` (runtime OS-change test, mocked `matchMedia`) | **PASS** |
| Token-Driven Theming Contract | `globals.css` `:root`/`.dark` custom properties; `--primary` hue 264 unchanged in both blocks | Spot-check below (§4a) — no dedicated automated contrast/hue test exists | **PASS** (manual/grep-verified, no automated test) |
| Dark Surface Mood and Contrast | `.dark` `--background: oklch(0.16 0.02 264)` (navy, chroma > 0), borders unchanged (white-alpha) | design.md's computed contrast table (18.6:1 fg, 5.17:1 primary) — no automated WCAG test in the suite | **PARTIAL** — visually/arithmetically justified in design.md, not verified by an executable test (task 9.6 explicitly deferred this to verify, and no scripted contrast check exists) |
| Semantic Success Token | `--success`/`--success-foreground` in `globals.css` `:root`+`.dark`+`@theme inline`; 12 sites across 7 files use `bg-success`/`text-success` | `status-panel.test.tsx`, `HashOnlyCard.test.tsx`, `UploadVerdictPanel.test.tsx`, `StateBadge` tests (via `history` suite), `VerificationDemo.test.tsx`, `Hero`/`verify/[id]/page` covered indirectly by their existing render tests — none pin the literal class name (grep-confirmed in tasks.md 7.1) | **PASS** for "not emerald" (grep = 0 matches); contrast sub-scenario same automated-test gap as above — **PARTIAL** |

**Note on the two PARTIAL items**: both concern WCAG-AA numeric contrast verification. Design.md provides a computed-by-hand contrast table (not a build-time/test-time check), and tasks.md's own task 9.6 explicitly defers this to a manual/DevTools pass in verify — it is not automatable as a unit test with the current tooling. This is a process gap (no contrast-checking script/test exists in the repo), not evidence the values are wrong. Recommend either accepting the hand-computed values as sufficient (values are well clear of the 4.5:1/3:1 thresholds per design.md) or adding a scripted OKLab contrast check in a follow-up.

## 4. Spot-Checks

**a. `globals.css` tokens** — confirmed via grep:
- `--success`/`--success-foreground` present exactly in `:root` (line 86-87) and `.dark` (line 122-123). ✅
- `.dark` `--background`: `oklch(0.16 0.02 264)` (line 91) — matches design.md's navy re-tune, not the old neutral `oklch(0.145 0 0)`. ✅
- `.dark` `--primary`: `oklch(0.62 0.19 264)` (line 97) — unchanged indigo hue 264, matches design.md's "locked" row. `:root` `--primary`: `oklch(0.48 0.2 264)` (line 60), also hue 264. ✅
- `@theme inline` contains `--color-success: var(--success);` / `--color-success-foreground: var(--success-foreground);` (lines 42-43). ✅

**b.** `apps/web/lib/theme.ts` exists, isomorphic (no `next/headers` import), exports `ThemePreference`, `THEME_COOKIE_NAME`, `THEME_COOKIE_MAX_AGE_SECONDS`, `parseThemePreference`, `resolveServerHtmlClassName`, `buildThemeInitScript`, `buildThemeCookieOptions` — matches design.md's Interfaces section exactly. ✅

**c.** `layout.tsx` line 57: `suppressHydrationWarning` on `<html>`; lines 47-51: reads `theme` cookie via `cookies()` + `parseThemePreference`. ✅

**d.** `ThemeToggle` exists at `components/shell/ThemeToggle.tsx`. Its test (`ThemeToggle.test.tsx`) covers: `aria-pressed` per button (test at line 39), cookie write (`document.cookie` assertions, lines 62/71/83), and `classList` toggle (lines 63/72). ✅

**e.** `shellDictionary.theme` = `{ groupLabel: "Tema", light: "Claro", dark: "Oscuro", system: "Sistema" }` — all 4 required keys present, non-empty, neutral Spanish. ✅

**f.** No `emerald-` utility class remains in any of the 7 refactored files (`HashOnlyCard`, `Hero`, `verify/[id]/page`, `StateBadge`, `status-panel`, `UploadVerdictPanel`, `VerificationDemo`) — grep across `apps/web` for `emerald-` returns **zero matches**. All 12 sites confirmed migrated to `bg-success`/`text-success`/`bg-success/10` variants. ✅

**g.** `docs/adr/ADR-011-cookie-server-component-theming-sobre-next-themes.md` exists (125 lines, full ADR format: Contexto/Problema/Alternativas/Decisión/Consecuencias). Indexed in `docs/architecture/decisions.md` (line 31) and also in `docs/README.md` (line 54, beyond what was asked but consistent with task 8.3). ✅

**h.** `openspec/config.yaml`'s `context:` block no longer says "light-mode only" — it now reads "apps/web ships a light/dark/system theme toggle (cookie + Server Component SSR, no next-themes — see ADR-011)". ✅

## 5. "All Routes Dynamic" Consequence — Flagged for Review

`pnpm --filter @trustai/web build` confirms **all 13 App Router routes** (including `/`) render `ƒ (Dynamic)` — this is because `cookies()` is now read in both `app/layout.tsx` and `components/landing/Nav.tsx`, which opts the entire app out of static generation per Next.js's documented `cookies()` behavior.

**Finding: this consequence is NOT documented in ADR-011 or design.md.**

- ADR-011's "Consecuencias" section covers only maintenance-cost tradeoffs (hand-rolled `matchMedia` logic vs. `next-themes`) — it does not mention the static→dynamic rendering-strategy shift.
- design.md has no section addressing build-output/rendering-strategy impact.
- The **only** place this is recorded is a note the apply agent added inline in `tasks.md` (task 9.4), explicitly flagging it as a gap for `sdd-verify` to confirm.

**Assessment**: this is an accepted, correct, and inherent architectural consequence of the cookie+SSR approach ADR-011 already chose (not a functional regression — no test failed because of it, and dynamic rendering is expected/acceptable for an authenticated app with a BFF). It is **not a regression**, but it is an **undocumented architectural consequence** that should have been captured in ADR-011's "Consecuencias" (or "Negativas") section at design time, since it affects caching/CDN behavior and hosting cost characteristics going forward.

**Recommendation (WARNING, not blocking)**: add a short addendum to ADR-011 (or a new "Seguimiento" bullet) noting that `apps/web` is now fully dynamically rendered end-to-end as a result of this decision, so future reviewers don't rediscover it via a build log.

## 6. Issues

**WARNINGS**
1. ADR-011/design.md do not document the "all routes now Dynamic" build consequence (see §5) — recommend a documentation addendum, not a code change.
2. Requirement "Dark Surface Mood and Contrast" and the contrast sub-scenario of "Semantic Success Token" rely on design.md's hand-computed OKLab contrast numbers rather than an executable/scripted check — acceptable given values are well clear of AA thresholds, but there's no regression guard if tokens change later.

**SUGGESTIONS**
1. Consider a lightweight contrast-check script/test (OKLab → WCAG relative luminance) to make the two PARTIAL requirements above fully test-covered and regression-safe.

No CRITICAL issues found.

## 7. Verdict

**PASS WITH WARNINGS**

All 48 tasks complete, all 5 gate commands green (61/61 web test files, 318/318 web tests, clean lint/typecheck/build, zero workspace regressions), all spec requirements implemented and grep/read-verified, all spot-checks (a–h) pass. The two warnings are documentation gaps (undocumented rendering-strategy consequence; contrast requirements verified by design-time arithmetic rather than an automated test) — neither blocks correctness or represents a functional regression.
