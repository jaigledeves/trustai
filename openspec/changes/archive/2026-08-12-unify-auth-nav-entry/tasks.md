# Tasks: Unify Auth Nav Entry Point

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300-380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — one cohesive fix |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Auth-cluster unification (dictionary, `HeaderAuthActions`, `Nav`, verify layout, `LoginForm` cross-link) | PR 1 | Base: main. Skip `(dashboard)/layout.tsx` |

## Phase 1: Dictionary Changes

- [x] 1.1 Add `shellDictionary.nav.signIn = "Acceder"` in `apps/web/dictionaries/es/shell.ts`.
- [x] 1.2 Remove `nav.login` and `nav.register` from `apps/web/dictionaries/es/landing.ts` (keep `nav.sectionLinks`).
- [x] 1.3 Update `apps/web/app/page.test.tsx`'s `Nav` mock: stop reading `landingDictionary.nav.login`/`register`; use a hardcoded marker string (`VERIFICATION_DEMO_MARKER` convention).

## Phase 2: HeaderAuthActions (new, TDD)

- [x] 2.1 RED: create `apps/web/components/shell/HeaderAuthActions.test.tsx` — `false`: one "Acceder" link to `/login`, no "Mis DTR"/"Cerrar sesión"; `true`: "Mis DTR" → `/dtrs` + mocked `LogoutButton`, no "Acceder".
- [x] 2.2 GREEN: create `apps/web/components/shell/HeaderAuthActions.tsx` implementing `HeaderAuthActionsProps { isAuthenticated: boolean }`; no `'use client'`; no internal `getSession()`; composes `LogoutButton` when authenticated.
- [x] 2.3 REFACTOR: align button variant/size (`ghost`/`sm`) with the markup it replaces in `verify/[id]/layout.tsx`; confirm zero client boundary.

## Phase 3: Nav Integration (TDD)

- [x] 3.1 RED: update `apps/web/components/landing/Nav.test.tsx` — drop the old login/register case; add logged-out ("Acceder", no `LogIn` icon) and logged-in ("Mis DTR"+"Cerrar sesión") cases; mock `LogoutButton`/session cookie as in `verify/[id]/layout.test.tsx`.
- [x] 3.2 GREEN: update `apps/web/components/landing/Nav.tsx` — add `getSession()`, drop the `LogIn` import and inline `Button`/`Link` pair, render `<HeaderAuthActions isAuthenticated={isAuthenticated} />`.
- [x] 3.3 REFACTOR: fix stale JSDoc mentioning "login/register actions"; confirm `Nav` stays non-`'use client'`.

## Phase 4: Verify Layout Integration (TDD)

- [x] 4.1 RED: update `apps/web/app/verify/[id]/layout.test.tsx` — logged-in drops `/certificar/i`, keeps "Mis DTR"/"Cerrar sesión"; logged-out adds "Acceder" → `/login`, alongside existing section-links/`ThemeToggle` assertions.
- [x] 4.2 GREEN: update `apps/web/app/verify/[id]/layout.tsx` — replace both inline auth branches with `<HeaderAuthActions isAuthenticated={isAuthenticated} />`; keep `sectionLinks` only for logged-out; keep `ThemeToggle` in both states.
- [x] 4.3 REFACTOR: drop now-unused `Button`/`LogoutButton` imports; update header JSDoc to describe the shared cluster, not "Mis DTR / Certificar".

## Phase 5: LoginForm Cross-Link (TDD)

- [x] 5.1 RED: add a case to `LoginForm.test.tsx` — link named `authDictionary.login.registerCta` has `href="/register"`, accessible name distinct from "Ingresar".
- [x] 5.2 GREEN: add the cross-link paragraph to `LoginForm.tsx` using `authDictionary.login.registerPrompt`/`registerCta` (moved from `login/page.tsx`).
- [x] 5.3 GREEN: delete the duplicated cross-link block from `apps/web/app/(auth)/login/page.tsx`; drop the now-unused `Link` import.
- [x] 5.4 REFACTOR: check spacing/`className` consistency with the forgot-password link.

## Phase 6: Cleanup / Removal Verification

- [x] 6.1 Grep-confirm zero remaining `LogIn` (lucide-react) imports under `apps/web`.
- [x] 6.2 Grep-confirm zero remaining references to `landingDictionary.nav.login`/`nav.register`.

## Phase 7: Full Gate

- [x] 7.1 `pnpm --filter @trustai/web test`
- [x] 7.2 `pnpm --filter @trustai/web lint`
- [x] 7.3 `pnpm --filter @trustai/web typecheck`
- [x] 7.4 `pnpm --filter @trustai/web build`
