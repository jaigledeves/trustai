# Design: Unify Auth Nav Entry Point

## Technical Approach

Extract the public auth cluster into one non-client Server Component,
`components/shell/HeaderAuthActions.tsx`, consumed identically by
`landing/Nav.tsx` and `app/verify/[id]/layout.tsx`. Each caller computes
an `isAuthenticated` boolean from its own `getSession()` call and passes it
as a prop — `HeaderAuthActions` itself never calls `getSession()`.
`LoginForm.tsx` gains a register cross-link by **reusing** dictionary keys
that already serve this exact purpose, relocated from `login/page.tsx`.

## Deviations from the Accepted Decisions (verified against code)

| Accepted decision said | Codebase check | Design decision |
|---|---|---|
| `HeaderAuthActions` "Reads `getSession()`" | Callers already need `getSession()` themselves (verify layout's Wordmark href; Nav gains one) | Component takes `isAuthenticated: boolean` prop instead — one session read per request, zero-mock unit testing |
| "New copy in `auth.ts`" for the cross-link | `authDictionary.login.registerPrompt`/`registerCta` ("¿No tienes una cuenta?" / "Crear cuenta") already exist, already rendered today in `login/page.tsx:24-29`, already non-voseo | Reuse the existing keys; move the markup into `LoginForm.tsx`, delete the duplicate from `page.tsx` — no new keys needed |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Session read location | Caller passes `isAuthenticated` prop | Component calls `getSession()` internally | No second cookie read on `verify/[id]`; pure render function, zero-mock unit test |
| Auth cluster variants | Single fixed composition, no slot props | Optional "Certificar" slot on verify | Proposal rejects per-surface variants; "Mis DTR" → dashboard is one click away |
| Visual density | One `size="sm"` everywhere | Landing's old `size="lg"` | `web-visual-coherence` wants one look; landing's CTA weight lives in `Hero`/`FinalCta` |
| Cross-link copy | Reuse `login.registerPrompt`/`registerCta` | New keys per proposal wording | Identical-intent keys already exist and are live — new ones duplicate copy |
| `landingDictionary.nav.login`/`register` | Remove | Leave unused | Zero production usage after `Nav.tsx` change (grep-verified) |

## Data Flow

    getSession() (lib/session.ts)
            │
            ▼
     isAuthenticated: boolean
       │                    │
       ▼                    ▼
   landing/Nav.tsx    verify/[id]/layout.tsx
       │                    │
       └──────┬─────────────┘
              ▼
     <HeaderAuthActions isAuthenticated />
              │
     ┌────────┴─────────┐
     ▼                   ▼
  false: "Acceder"   true: "Mis DTR" (ghost)
   → /login            + <LogoutButton />

`(dashboard)/layout.tsx` is **not** touched — its own redirect-on-no-
session guard and full authenticated nav (incl. `Certificar documento`)
stay as-is, out of scope per the proposal.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/shell/HeaderAuthActions.tsx` | Create | Sync component; `isAuthenticated` prop; "Acceder" or "Mis DTR" + `LogoutButton` |
| `components/landing/Nav.tsx` | Modify | Add `getSession()`; drop `LogIn` + inline buttons; render `HeaderAuthActions` |
| `app/verify/[id]/layout.tsx` | Modify | Replace inline auth branches with `HeaderAuthActions`; keep section links + `ThemeToggle` |
| `components/auth/LoginForm.tsx` | Modify | Add register cross-link (moved from `login/page.tsx`) |
| `app/(auth)/login/page.tsx` | Modify | Remove now-duplicated cross-link paragraph |
| `dictionaries/es/shell.ts` | Modify | Add `nav.signIn: "Acceder"` |
| `dictionaries/es/landing.ts` | Modify | Remove `nav.login`, `nav.register` |
| `components/landing/Nav.test.tsx` | Modify | Session-aware assertions |
| `app/verify/[id]/layout.test.tsx` | Modify | Drop "Certificar" assertion; add "Acceder" assertion |
| `app/page.test.tsx` | Modify | `Nav` mock stops referencing removed keys |
| `components/auth/LoginForm.test.tsx` | Modify | New register-cross-link case |

## Interfaces / Contracts

```ts
// components/shell/HeaderAuthActions.tsx
export interface HeaderAuthActionsProps {
  isAuthenticated: boolean;
}
export function HeaderAuthActions(props: HeaderAuthActionsProps): JSX.Element;
```

No `'use client'` directive — composes the existing client `LogoutButton`
as a child, same pattern `(dashboard)/layout.tsx` and `verify/[id]/layout.tsx`
already use.

## Accessibility

- "Acceder" renders as visible link text (`Button asChild` + `Link`) — its
  accessible name is the text itself, never icon-only (satisfies
  `web-visual-coherence`).
- `LogoutButton` keeps its existing `aria-label={shellDictionary.nav.logout}`.
- "Acceder" / "Mis DTR" / "Cerrar sesión" are three distinct accessible
  names — no sign-in/sign-out ambiguity.
- `LoginForm`'s cross-link (`registerCta` = "Crear cuenta") has an
  accessible name distinct from the submit button (`submit` = "Ingresar").

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (new) | `HeaderAuthActions` logged-out vs logged-in | New test file; plain sync render, mock `LogoutButton` (existing convention) |
| Unit (modify) | `Nav` session-aware | Branch the `next/headers` mock on the session cookie (pattern: `layout.test.tsx`'s `cookieValues`); replace login/register assertion with logged-out/in cases |
| Unit (modify) | verify layout | Drop `/certificar/i` assertion; add "Acceder" assertion; `ThemeToggle` cases untouched |
| Unit (modify) | Landing composition | `page.test.tsx`'s `Nav` mock uses a hardcoded label instead of the removed dictionary keys (`VERIFICATION_DEMO_MARKER` convention) |
| Unit (new case) | Login → register link | Link named `registerCta`, `href="/register"`, distinct from "Ingresar" |

Precedent: Server Components reading `next/headers`/`getSession` are
already unit-tested directly here via `render(await Component())` +
`vi.mock("next/headers", ...)` (`Nav`, `(dashboard)/layout.tsx`,
`verify/[id]/layout.tsx`) — no pragmatic fallback needed.
`HeaderAuthActions` needs even less: a plain boolean prop, zero mocks.

## Migration / Rollout

Pure UI change, no data/schema/API impact. No feature flag; single commit
set, reversible per the proposal's rollback plan.

## Open Questions

- [ ] None blocking. Confirm before `apply`: OK to delete
      `landingDictionary.nav.login`/`nav.register` outright (zero
      production usage, grep-verified)?
