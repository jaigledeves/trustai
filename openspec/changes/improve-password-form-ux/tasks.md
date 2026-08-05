# Tasks: Improve Password Form UX (Confirm on Register, Proactive Policy Hint)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150–200 (frontend-only: 1 dictionary file, 1 validation module + test, 2 form components + tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — `feat/password-form-ux` → `main` |
| Delivery strategy | single-pr (project convention: small frontend-only changes ship as one PR) |
| Chain strategy | pending (N/A — no chaining needed) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full change: dictionary + validation + both forms + tests | PR 1 | Base: `feat/password-form-ux`. Single cohesive UX fix, no independent sub-deliverables — splitting would fragment one reviewable behavior change |

## Phase 1: Dictionary (Foundation)

- [ ] 1.1 Add `register.confirmPasswordLabel`, `register.errorPasswordMismatch`, `register.passwordHint`, `resetPassword.passwordHint` to `apps/web/dictionaries/es/auth.ts`, exact copy from `design.md` (lines 78–90)
- [ ] 1.2 Run `apps/web/dictionaries/es/dictionaries.test.ts` — confirm the generic `collectLeafValues` non-empty-string audit covers the 4 new keys automatically (no test edit needed there)

## Phase 2: Validation (RED → GREEN)

- [ ] 2.1 RED: in `apps/web/lib/validation/auth.test.ts`, convert the 4 existing 2-arg `validateRegisterForm` calls (lines 11, 17, 24, 32) to 3-arg by passing a matching `confirmPassword`; add 2 failing cases mirroring `validateResetPasswordForm`'s mismatch tests (lines 85–90): matching pair → no `confirmPassword` error; mismatched pair → `errors.confirmPassword` is `register.errorPasswordMismatch`, independent of a weak-password flag
- [ ] 2.2 GREEN: in `apps/web/lib/validation/auth.ts`, add `confirmPassword?: string` to `RegisterFormErrors`, add required 3rd param `confirmPassword: string` to `validateRegisterForm`, add the mismatch check per `design.md`'s interface block (lines 47–71)

## Phase 3: RegisterForm (RED → GREEN)

- [ ] 3.1 RED: in `apps/web/components/auth/RegisterForm.test.tsx`, fill the confirm-password field with a matching value in the existing happy-path tests; add a mismatch-blocks-submit test (differing confirm value → no request sent, inline `errorPasswordMismatch` text shown); add a hint-visible-on-first-render test (render, assert `register.passwordHint` text present before typing/submitting)
- [ ] 3.2 GREEN: in `apps/web/components/auth/RegisterForm.tsx`, add `confirmPassword` state, the confirm-password `Input` block (mirror `ResetPasswordForm.tsx:133-148`, `id="register-confirm-password"`, `confirmPasswordLabel`), the static hint `<p>` under the password `Input` before its conditional error `<p>` (between lines 107–108), and update the `handleSubmit` call to `validateRegisterForm(email, password, confirmPassword)`

## Phase 4: ResetPasswordForm (RED → GREEN)

- [ ] 4.1 RED: in `apps/web/components/auth/ResetPasswordForm.test.tsx`, add a hint-visible-on-first-render test (render with a valid token, assert `resetPassword.passwordHint` text present before typing/submitting)
- [ ] 4.2 GREEN: in `apps/web/components/auth/ResetPasswordForm.tsx`, add the static hint `<p>` under the new-password `Input`, before its conditional error `<p>` (between lines 126–127)

## Phase 5: Verification Gate

- [ ] 5.1 Run `pnpm --filter @trustai/web test` — all suites green, including every RED case added above
- [ ] 5.2 Run `pnpm --filter @trustai/web lint`
- [ ] 5.3 Run `pnpm --filter @trustai/web typecheck`
- [ ] 5.4 Run `pnpm --filter @trustai/web build`

No `apps/api` tasks — this is a frontend-only change; `PASSWORD_POLICY` is unchanged.
