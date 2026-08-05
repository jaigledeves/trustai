# Proposal: Improve Password Form UX (Confirm on Register, Proactive Policy Hint)

## Intent

Product audit recs 8 and 10: `RegisterForm` has a single password field, so
a silent typo creates an unintended password the user only discovers at
login — while `ResetPasswordForm` already confirms it. And the password
policy (min 8 chars, 1 letter, 1 digit) is only shown reactively as an
error after a failed submit on both register and reset, a "gotcha" pattern.
Fix both by reusing the pattern `ResetPasswordForm` already proves works.

**Package**: `apps/web` only. No `apps/api` changes, no DB, no new
endpoints — this is client-side form UX and copy.

## Scope

### In Scope
- `RegisterForm`: add a confirm-password field mirroring `ResetPasswordForm`'s
- `validateRegisterForm`: add mismatch check mirroring
  `validateResetPasswordForm` (`apps/web/lib/validation/auth.ts:83-96`);
  new `authDictionary.register.errorPasswordMismatch` key
- `RegisterForm` and `ResetPasswordForm`: static helper text below the
  password field stating the policy proactively (visible before any
  submit), sourced from new dictionary key(s) — no hardcoded copy (RNF-041)
- Accessibility: on the password-creation fields these two forms touch,
  wire `aria-describedby` (hint id on mount, error id on failure) and
  `aria-invalid` (on error) so assistive tech announces the policy and any
  validation error — additive, no `Input` component change
- TDD: failing tests first for mismatch validation, hint rendering, and the
  a11y association

### Out of Scope
- Changing `PASSWORD_POLICY` itself (`apps/web/lib/validation/auth.ts:5`) —
  copy/UX only, the rule is unchanged
- `LoginForm` (no password creation there, no policy to hint)
- Backend DTO/validation changes (`apps/api`) — policy is unchanged, so
  nothing to mirror server-side
- Backfilling a full spec for existing register/login/verify-email
  behavior — only the two new guarantees this change adds are specified
- Retrofitting `aria-describedby`/`aria-invalid` onto email fields,
  `LoginForm`, or other forms — the a11y wiring is scoped to the
  password-creation fields these two forms already touch; a site-wide
  consistency pass is deferred

## Capabilities

### New Capabilities
- `web-auth-flow`: register-form guarantees only. Code already references
  this name in comments (`RegisterForm.tsx:18`,
  `dictionaries/es/auth.ts:2`) as a spec that predates SDD and was never
  promoted to `openspec/specs/` (confirmed absent). This proposal creates
  the spec file for the first time, but scoped ONLY to the two new
  guarantees added here (confirm-password match, proactive policy hint) —
  it does NOT backfill existing register/login/verify-email behavior.

### Modified Capabilities
- `auth-password-recovery`: adds one new requirement — proactive
  password-policy hint on `ResetPasswordForm` — alongside the existing
  "Reset Form Confirms Password Match" requirement, which is unchanged.

## Approach

Copy `ResetPasswordForm`'s confirm-field JSX and
`validateResetPasswordForm`'s mismatch check verbatim into
`RegisterForm`/`validateRegisterForm`, renaming only `newPassword` →
`password`. For the hint, add a `<p>` with `text-muted-foreground` (or the
project's existing helper-text style) directly under each password
`Input`, always rendered — not conditional on error state. New dictionary
keys: `register.errorPasswordMismatch`, `register.passwordHint`,
`resetPassword.passwordHint` (reuse one hint string via a shared constant
if the design phase prefers; deferred).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/components/auth/RegisterForm.tsx` | Modified | +confirm field, +hint text |
| `apps/web/components/auth/ResetPasswordForm.tsx` | Modified | +hint text only |
| `apps/web/lib/validation/auth.ts` | Modified | `validateRegisterForm` gains mismatch check + `confirmPassword` param |
| `apps/web/dictionaries/es/auth.ts` | Modified | +`register.errorPasswordMismatch`, +hint key(s) |
| `openspec/specs/web-auth-flow/spec.md` | New | Narrow spec: confirm-match + proactive hint on register |
| `openspec/specs/auth-password-recovery/spec.md` | Modified | +1 requirement (proactive hint on reset) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `validateRegisterForm` signature change breaks callers | Low | Single call site (`RegisterForm`), grep-verified before apply |
| Hint copy contradicts the reactive error copy if worded differently | Low | Reuse the exact policy wording from `errorPasswordPolicy`, not new phrasing |
| Naming `web-auth-flow` implies broader coverage than it has | Medium | Spec purpose statement explicitly scopes it to these two guarantees only |

## Rollback Plan

Revert the feature commit(s). Pure UI/copy/validation change with no
migration, no persisted state, and no API contract — rollback has zero
blast radius beyond the two form files, the validation module, and the
dictionary.

## Success Criteria

- [ ] Register with mismatched passwords blocks submit, shows
      `register.errorPasswordMismatch`, no network call
- [ ] Register and reset forms show the password-policy hint before any
      submit attempt (no error state required)
- [ ] On the touched password fields, the hint is part of the input's
      accessible description on mount, and errors surface via `aria-invalid`
      + the accessible description
- [ ] All new copy lives in `dictionaries/es/auth.ts`, none hardcoded
- [ ] `pnpm --filter @trustai/web test` and `typecheck` pass
