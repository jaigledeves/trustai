# Delta for auth-password-recovery

No `openspec/specs/auth-password-recovery/` exists yet — every requirement
below is newly introduced by this change.

## ADDED Requirements

### Requirement: Forgot-Password Enumeration Defense

`POST /auth/forgot-password` MUST return `200 { ok: true }` regardless of
whether the submitted email belongs to a registered user. The system MUST
perform any database write or notification call only when a matching user
exists; it MUST NOT return a different status or body shape for unknown
emails.

#### Scenario: Registered email

- GIVEN a registered, existing user email
- WHEN `POST /auth/forgot-password` is called with that email
- THEN the response is `200 { ok: true }`
- AND a reset token is generated and a notification is sent

#### Scenario: Unknown email

- GIVEN an email with no matching user
- WHEN `POST /auth/forgot-password` is called with that email
- THEN the response is `200 { ok: true }` (identical shape to the registered case)
- AND no reset token is generated and no notification is sent

### Requirement: Password Reset Token Generation and Storage

The system MUST generate a raw `uuidv4()` token, persist only its SHA-256
hash plus an expiry timestamp on the `User` record
(`passwordResetToken`, `passwordResetExpiresAt`), and hand the raw token
only to the notification port — mirroring the verify-email token pattern.

#### Scenario: Token generated on valid forgot-password request

- GIVEN a registered user requests a password reset
- WHEN the use case executes
- THEN `User.passwordResetToken` stores a SHA-256 hash, never the raw token
- AND `User.passwordResetExpiresAt` is set to now + 24h (same TTL as email verification)

### Requirement: Password Reset Token Single-Use and Expiry

`POST /auth/reset-password` MUST reject a token that does not match a
stored hash or whose expiry has passed, with `400`. On successful reset,
the system MUST clear both `passwordResetToken` and
`passwordResetExpiresAt` so the token cannot be reused.

#### Scenario: Expired token

- GIVEN a reset token whose `passwordResetExpiresAt` is in the past
- WHEN `POST /auth/reset-password` is called with that token
- THEN the response is `400` and the password is unchanged

#### Scenario: Reused token

- GIVEN a token already consumed by a successful reset
- WHEN `POST /auth/reset-password` is called again with the same raw token
- THEN the response is `400` (columns were cleared on first use)

### Requirement: Reset Password Enforces Password Policy

The new password MUST satisfy the same policy as registration: minimum 8
characters, at least one letter and one digit — validated with the DTO
class-validator rule on `apps/api` and mirrored in Zod/regex validation on
`apps/web` before submission.

#### Scenario: Weak new password rejected

- GIVEN a valid, unexpired reset token
- WHEN `POST /auth/reset-password` is called with a password shorter than 8 characters
- THEN the response is `400` and the password is unchanged

### Requirement: Successful Reset Updates Password and Verifies Email

On a valid token and policy-compliant password, the system MUST hash the
new password with the same hasher port used by registration, persist it,
clear the reset token columns, and set `emailVerified = true` (possessing
a working reset link proves ownership of the email, resolving accounts
stuck unverified).

#### Scenario: Successful reset

- GIVEN a valid, unexpired reset token and a policy-compliant new password
- WHEN `POST /auth/reset-password` is called
- THEN the response indicates success
- AND the user can log in with the new password
- AND `emailVerified` is `true`

### Requirement: Password Reset Stub Notification

`NotificationPort` MUST expose `sendPasswordResetEmail(email, rawToken)`.
The stub adapter MUST log the raw token (mirroring
`sendVerificationEmail`) rather than deliver a real email; real delivery
is explicitly out of scope.

#### Scenario: Stub logs the reset token

- GIVEN a forgot-password request for a registered user
- WHEN the use case calls `sendPasswordResetEmail`
- THEN the stub adapter logs the email and raw token, no external call is made

### Requirement: Login Page Forgot-Password Entry Point

`LoginForm` MUST render a link to `/forgot-password` using dictionary key
`auth.login.forgotPasswordLink` (no hardcoded copy).

#### Scenario: Link visible on login

- GIVEN a user on `/login`
- WHEN the page renders
- THEN a "¿Olvidaste tu contraseña?" link to `/forgot-password` is visible

### Requirement: Reset Form Confirms Password Match

`ResetPasswordForm` MUST require the new-password and confirm-password
fields to match before submitting; a mismatch MUST block submission and
show `auth.resetPassword.errorPasswordMismatch` without a network call.

#### Scenario: Mismatched confirmation blocks submit

- GIVEN a user enters different values in "new password" and "confirm password"
- WHEN they submit the form
- THEN no request is sent and the mismatch error is shown

### Requirement: Invalid or Expired Token Web Handling

`/reset-password` MUST show a distinct error state (not a silent redirect)
when the token is missing, invalid, or expired, offering a link to
`/forgot-password` to request a new one.

#### Scenario: Expired link opened from web

- GIVEN a user opens `/reset-password?token=<expired>`
- WHEN the reset request returns `400`
- THEN an error panel is shown with a link to `/forgot-password`
