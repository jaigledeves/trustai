# Delta for web-auth-flow

## ADDED Requirements

> Note: no existing requirement in `openspec/specs/web-auth-flow/spec.md`
> covers a login-to-register cross-link, so this is ADDED rather than a
> copy-edit of an existing block, even though `proposal.md` lists this
> capability under "Modified Capabilities" (the domain, not a specific
> requirement, is touched).

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
