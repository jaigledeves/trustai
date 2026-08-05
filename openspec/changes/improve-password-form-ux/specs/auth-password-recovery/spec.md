# Delta for auth-password-recovery

## ADDED Requirements

### Requirement: Reset Form Displays Password Policy Proactively

`ResetPasswordForm` MUST render static helper text stating the password
policy (minimum 8 characters, at least one letter and one digit) below
the new-password field, sourced from
`authDictionary.resetPassword.passwordHint`, always visible — not
conditional on any error state.

#### Scenario: Policy hint visible before any submit attempt

- GIVEN a user opens `/reset-password` with a valid token
- WHEN the form renders, before typing or submitting anything
- THEN `authDictionary.resetPassword.passwordHint` text is visible below the new-password field
