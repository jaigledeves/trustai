# Delta for public-landing

## ADDED Requirements

> Note: `proposal.md` lists `public-landing` under "Modified Capabilities"
> (the domain is touched), but no existing requirement in
> `openspec/specs/public-landing/spec.md` currently governs the Nav's auth
> CTA — `Landing Composition` only fixes section order/composition. Per
> the MODIFIED-workflow rule (copy-full-then-edit an existing block), this
> is expressed as an ADDED requirement rather than a MODIFIED one.

### Requirement: Session-Aware Nav Auth Affordance

The landing `Nav` MUST read the visitor's session (`getSession()`) and
render exactly one auth affordance state. When logged out, it MUST render
a single primary "Acceder" action (`shellDictionary.nav.signIn`) linking
to `/login`, and MUST NOT render a "Crear cuenta" button or any login icon
in the nav. When logged in, it MUST render "Mis DTR" (`shellDictionary.nav.dtrs`,
linking to `/dtrs`) plus "Cerrar sesión" (`shellDictionary.nav.logout`) via
the shared `LogoutButton`, and MUST NOT render a "Certificar"/new-certification
shortcut. `ThemeToggle` and the section links (`sectionLinks`) MUST render
identically in both auth states.

#### Scenario: Logged-out visitor sees a single Acceder CTA

- GIVEN a visitor with no session requests `/`
- WHEN `Nav` renders
- THEN it shows exactly one primary action labeled
  `shellDictionary.nav.signIn` linking to `/login`
- AND no "Crear cuenta" button or login icon is rendered

#### Scenario: Logged-in visitor sees Mis DTR and Cerrar sesión only

- GIVEN a visitor with an active session requests `/`
- WHEN `Nav` renders
- THEN it shows "Mis DTR" linking to `/dtrs` and "Cerrar sesión"
- AND no "Certificar"/new-certification shortcut is rendered

#### Scenario: ThemeToggle and section links are unaffected by auth state

- GIVEN either a logged-out or a logged-in visitor requests `/`
- WHEN `Nav` renders
- THEN `ThemeToggle` and all four section links render identically in
  both states

## MODIFIED Requirements

### Requirement: Landing Composition

The system MUST render route `/` as a Server Component (`apps/web/app/page.tsx`)
composing Nav, Hero, HowItWorks, VerificationDemo, UseCases, Pillars, Faq,
FinalCta, and Footer sections from `apps/web/components/landing/`. Only
`VerificationDemo` MUST declare `'use client'`; every other section MUST NOT.
`Nav` becomes session-aware (see "Session-Aware Nav Auth Affordance" above)
but this MUST NOT introduce an additional `'use client'` boundary — session
resolution happens server-side via `getSession()`.
(Previously: no mention of `Nav`'s session-awareness or client-boundary
impact.)

#### Scenario: Page renders all sections in order

- GIVEN a visitor requests `/`
- WHEN the page renders
- THEN Nav, Hero, HowItWorks, VerificationDemo, UseCases, Pillars, Faq,
  FinalCta, and Footer each render exactly once, in that order

#### Scenario: Only VerificationDemo ships client JS

- GIVEN the composed page's section modules, including the now
  session-aware `Nav`
- WHEN each is inspected for a `'use client'` directive
- THEN only `VerificationDemo.tsx` has it; the rest, including `Nav.tsx`,
  MUST NOT
