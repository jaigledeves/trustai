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
