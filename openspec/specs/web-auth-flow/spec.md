# web-auth-flow

Scope: register-form guarantees added by "Improve Password Form UX" —
confirm-password match and a proactive password-policy hint, mirroring the
pattern already proven by `auth-password-recovery`'s reset flow. This is
NOT a backfill of existing register/login/verify-email behavior
(`apps/web/components/auth/RegisterForm.tsx`,
`apps/web/lib/validation/auth.ts`) — only the two guarantees below are
covered.

## Purpose

The system MUST prevent a silent password typo from creating an
unintended account credential, and MUST make the password policy visible
before the user attempts to submit, so the policy is never discovered
only as a reactive post-submit error.

## Requirements

### Requirement: Register Form Confirms Password Match

`RegisterForm` MUST require the password and confirm-password fields to
match before submitting; a mismatch MUST block submission (no network
call) and show `authDictionary.register.errorPasswordMismatch` inline
next to the confirm-password field.

#### Scenario: Matching passwords allow submit

- GIVEN a user enters the same value in "password" and "confirm password"
- WHEN they submit the form
- THEN `validateRegisterForm` reports no mismatch error
- AND the registration request is sent

#### Scenario: Mismatched confirmation blocks submit

- GIVEN a user enters different values in "password" and "confirm password"
- WHEN they submit the form
- THEN no request is sent
- AND `authDictionary.register.errorPasswordMismatch` is shown inline next to the confirm-password field

### Requirement: Register Form Displays Password Policy Proactively

`RegisterForm` MUST render static helper text stating the password
policy (minimum 8 characters, at least one letter and one digit) below
the password field, sourced from `authDictionary.register.passwordHint`,
always visible — not conditional on any error state.

#### Scenario: Policy hint visible before any submit attempt

- GIVEN a user opens the register form for the first time
- WHEN the form renders, before typing or submitting anything
- THEN `authDictionary.register.passwordHint` text is visible below the password field

### Requirement: Register Password Fields Expose Hints and Errors to Assistive Technology

The register password and confirm-password inputs MUST be programmatically
associated with their helper/error text so assistive technology announces
them. The password input MUST reference its policy-hint text via
`aria-describedby` at all times; when a field has a validation error, that
input MUST set `aria-invalid` and also reference its error text via
`aria-describedby`.

#### Scenario: Password hint is part of the field's accessible description on mount

- GIVEN a user opens the register form for the first time
- WHEN the form renders, before typing or submitting anything
- THEN the password input's accessible description includes `authDictionary.register.passwordHint`
- AND the password input is not marked invalid

#### Scenario: A field error is exposed via aria-invalid and the accessible description

- GIVEN a user submits with a policy-violating password and/or a mismatched confirmation
- WHEN the inline errors render
- THEN each errored input is marked `aria-invalid`
- AND that input's accessible description includes its error message

### Requirement: Login and Register Subtitles Use Plain Language and the Canonical DTR Name

`authDictionary.login.subtitle` and `authDictionary.register.subtitle`
MUST be understandable by a non-technical user without prior knowledge of
"blockchain" as an unexplained term, and MUST NOT contain the English
form "Digital Trust Records"; any reference to the certified record MUST
use the canonical "Registro Digital de Confianza (DTR)" name established
by `web-plain-language`.

#### Scenario: Login subtitle has no unexplained jargon or English DTR name

- GIVEN `authDictionary.login.subtitle`
- WHEN read on its own by a first-time visitor
- THEN it conveys what logging in gives access to in plain language, and
  it does not contain the literal substring "Digital Trust Records"

#### Scenario: Register subtitle has no unexplained jargon or English DTR name

- GIVEN `authDictionary.register.subtitle`
- WHEN read on its own by a first-time visitor
- THEN it conveys what creating an account enables in plain language, and
  it does not contain the literal substring "Digital Trust Records"

#### Scenario: Any DTR mention in auth copy uses the canonical Spanish name

- GIVEN `authDictionary.login.subtitle` and `authDictionary.register.subtitle`
- WHEN either references the certified record
- THEN it uses the canonical Spanish name in its singular ("Registro
  Digital de Confianza") or natural plural ("Registros Digitales de
  Confianza") form, with the "(DTR)" acronym expansion required only where
  the bare "DTR" acronym is later used on the same page, and it NEVER uses
  the English form "Digital Trust Records"

### Requirement: Login Form Offers a Register Cross-Link

`LoginForm` MUST render a visible link to `/register`, sourced from
`authDictionary` (e.g. "¿No tenés cuenta? Crear cuenta"), so a visitor
without an account is never dead-ended on the login page. The link MUST
have an accessible name distinct from the form's submit button.

#### Scenario: Login form shows a working link to register

- GIVEN a visitor opens `/login`
- WHEN the form renders
- THEN a link with the dictionary-sourced register cross-link copy is
  visible
- AND activating it navigates to `/register`

#### Scenario: Register cross-link has its own accessible name

- GIVEN `LoginForm` is rendered
- WHEN the register cross-link and the submit button are inspected for
  their accessible names
- THEN the link's accessible name is distinct from the submit button's
  and identifies it as leading to account creation
