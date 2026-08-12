# Proposal: Unify Auth Nav Entry Point

**Package/domain**: apps/web

## Intent

Public nav auth affordance is incoherent: `landing/Nav.tsx` always shows a
`LogIn` icon + "Crear cuenta" button, even to already-logged-in users, and
`LogIn` visually mirrors `LogOut` (used for logout), so users misread it as
"exit". `verify/[id]/layout.tsx` is session-aware but offers no auth CTA at
all when logged out. `LoginForm.tsx` has no path to `/register`, dead-ending
visitors without an account. Move to a single, session-aware, manually-driven
auth entry point shared across public surfaces.

## Scope

### In Scope
- New shared Server Component `components/shell/HeaderAuthActions.tsx`:
  logged-out → single **Acceder** button → `/login`; logged-in → **Mis DTR**
  (ghost → `/dtrs`) + **Cerrar sesión** (`LogoutButton`). `ThemeToggle` stays
  external, rendered per-layout.
- `landing/Nav.tsx` becomes session-aware (`getSession`) and renders
  `HeaderAuthActions`; `LogIn` icon removed entirely.
- `verify/[id]/layout.tsx` reuses `HeaderAuthActions` for both auth states.
- `LoginForm.tsx`: add "¿No tenés cuenta? Crear cuenta" link → `/register`.
- New dictionary keys: shared "Acceder" label, login→register cross-link copy
  in `dictionaries/es/auth.ts`.

### Out of Scope
- "Email-first smart" login/register detection — **rejected**: would require
  revealing whether an email is registered, violating the anti-enumeration
  rule in `docs/13-Security.md` (login must return a generic error).
- `(auth)/layout.tsx` auto-redirect for already-authed visitors (optional,
  deferred).
- Any change to `(dashboard)/layout.tsx` (stays as-is).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `public-landing`: nav composition — session-aware auth cluster replaces
  static login-icon + register-button pair.
- `web-visual-coherence`: removes the `LogIn`/`LogOut` icon ambiguity;
  standardizes the auth cluster look across landing and verify nav.
- `web-public-verify`: verify nav's logged-out state gains an auth CTA;
  logged-in state drops the "Certificar" shortcut in favor of the shared
  cluster (No-Auth Access behavior unchanged).
- `web-auth-flow`: `LoginForm` gains a link to `/register`.

## Approach

Extract the auth cluster into one Server Component consumed by both
`landing/Nav.tsx` and `verify/[id]/layout.tsx`, reading session via the
existing `lib/session.ts` `getSession()`. Icon-based login CTA is replaced by
a text-labeled primary button ("Acceder") to remove ambiguity. Acquisition
already lives in page bodies (`Hero.tsx`, `FinalCta.tsx` → `/register`), so
dropping "Crear cuenta" from the nav does not reduce conversion surface.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `components/shell/HeaderAuthActions.tsx` | New | Shared session-aware auth cluster |
| `components/landing/Nav.tsx` | Modified | Session-aware, drops `LogIn` icon |
| `app/verify/[id]/layout.tsx` | Modified | Uses shared cluster both auth states |
| `components/auth/LoginForm.tsx` | Modified | Adds register cross-link |
| `dictionaries/es/auth.ts` | Modified | New label + cross-link copy |
| `dictionaries/es/landing.ts` / `shell.ts` | Modified | Reconcile/reuse existing keys |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Verify's logged-in users lose one-click "Certificar" shortcut | Medium | Accepted tradeoff for coherence; "Mis DTR" → dashboard still one click away |
| Existing tests assert old `LogIn` icon / verify nav markup | High | strict_tdd: update `Nav.test.tsx`, verify layout tests, add `LoginForm.test.tsx` case first |
| No-Auth Access on `/verify/[id]` accidentally gated | Low | Explicit scenario retained in `web-public-verify` delta spec; never redirect to login |

## Rollback Plan

Single-package (apps/web), UI-only change with no data/schema/API impact.
Revert the commit(s) touching `HeaderAuthActions.tsx`, `Nav.tsx`,
`verify/[id]/layout.tsx`, `LoginForm.tsx`, and the dictionary files — no
migration or backward-compat shim needed.

## Dependencies

None (uses existing `lib/session.ts`, `LogoutButton.tsx`, dictionary system).

## Success Criteria

- [ ] Logged-out landing and verify nav both show exactly one **Acceder** CTA
- [ ] Logged-in landing and verify nav show **Mis DTR** + **Cerrar sesión**, no `LogIn`/`LogOut` icon ambiguity
- [ ] `LoginForm` offers a working link to `/register`
- [ ] `/verify/[id]` never redirects unauthenticated visitors to `/login`
- [ ] All existing and updated tests pass under `pnpm --filter @trustai/web test`
