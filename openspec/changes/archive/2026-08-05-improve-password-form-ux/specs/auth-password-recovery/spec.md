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

### Requirement: Reset Password Fields Expose Hints and Errors to Assistive Technology

The reset new-password and confirm-password inputs MUST be programmatically
associated with their helper/error text so assistive technology announces
them. The new-password input MUST reference its policy-hint text via
`aria-describedby` at all times; when a field has a validation error, that
input MUST set `aria-invalid` and also reference its error text via
`aria-describedby`.

#### Scenario: New-password hint is part of the field's accessible description on mount

- GIVEN a user opens `/reset-password` with a valid token
- WHEN the form renders, before typing or submitting anything
- THEN the new-password input's accessible description includes `authDictionary.resetPassword.passwordHint`
- AND the new-password input is not marked invalid

#### Scenario: A field error is exposed via aria-invalid and the accessible description

- GIVEN a user submits with a policy-violating or mismatched password
- WHEN the inline errors render
- THEN each errored input is marked `aria-invalid`
- AND that input's accessible description includes its error message
