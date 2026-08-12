# Delta for web-public-verify

## MODIFIED Requirements

### Requirement: Public No-Auth Verification Page

`/verify/[id]` MUST be a Server Component. Viewing verification results
MUST NOT require login: no verification content, GET result, or POST
verdict is ever gated behind, or redirects to, authentication. The page
header MAY render a session-aware auth affordance (see "Unified Header
Auth Cluster on Verify" below) without this affordance gating any content.
`HashOnlyCard` MUST fetch `GET /public/verify/:id` server-side, no-store,
gated by `config.publicVerificationEnabled` (else `disabledMessage`).
Only `UploadVerdictPanel.tsx`/`ClientHashRecompute.tsx` MUST declare
`'use client'`; `page.tsx`, `layout.tsx`, `HashOnlyCard.tsx` MUST NOT.
(Previously: "no login/auth affordance" was stated as an absolute — the
header now MAY show a session-aware auth cluster, but content access
remains fully No-Auth.)

#### Scenario: No-auth render, flag-gated, only two client islands

- GIVEN a no-session visitor requests `/verify/[id]`
- WHEN the flag is true, it renders with no forced login and only
  `UploadVerdictPanel`/`ClientHashRecompute` carry `'use client'`
- AND WHEN false, only `disabledMessage` renders

#### Scenario: Authenticated visitor's session never gates verification content

- GIVEN a logged-in visitor requests `/verify/[id]`
- WHEN the page renders
- THEN the GET result, POST verdict flow, and all verification content
  render identically to the logged-out case — the auth cluster in the
  header is the only difference

#### Scenario: Verification never redirects to login

- GIVEN any visitor, logged in or not, requests `/verify/[id]`
- WHEN the page resolves
- THEN no redirect to `/login` occurs under any auth state

## ADDED Requirements

### Requirement: Unified Header Auth Cluster on Verify

The `/verify/[id]` layout header MUST render the same session-aware auth
cluster used by the landing `Nav`. Logged out: section links (excluding
`verificacion`) plus `ThemeToggle` plus a single "Acceder"
(`shellDictionary.nav.signIn`) action linking to `/login`. Logged in:
"Mis DTR" (→ `/dtrs`) plus "Cerrar sesión", with `ThemeToggle` still
present; it MUST NOT render a "Certificar"/new-certification shortcut.

#### Scenario: Logged-out verify header shows section links, ThemeToggle, and Acceder

- GIVEN a no-session visitor requests `/verify/[id]`
- WHEN the header renders
- THEN it shows the section links, `ThemeToggle`, and a single "Acceder"
  action linking to `/login`

#### Scenario: Logged-in verify header shows Mis DTR and Cerrar sesión, not Certificar

- GIVEN an authenticated visitor requests `/verify/[id]`
- WHEN the header renders
- THEN it shows "Mis DTR" linking to `/dtrs` and "Cerrar sesión"
- AND it does NOT show a "Certificar"/new-certification shortcut

#### Scenario: ThemeToggle renders in both auth states

- GIVEN either a logged-out or a logged-in visitor requests `/verify/[id]`
- WHEN the header renders
- THEN `ThemeToggle` is present in both states
