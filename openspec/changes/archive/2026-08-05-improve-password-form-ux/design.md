# Design: Improve Password Form UX (Confirm on Register, Proactive Policy Hint)

## Technical Approach

Client-only change in `apps/web`. Copy `ResetPasswordForm`'s proven
confirm-password pattern into `RegisterForm` (rename `newPassword` →
`password`), and add one static hint `<p>` under the password field on
both forms. No `apps/api`, no DB, no new endpoints — `PASSWORD_POLICY`
is unchanged.

## Architecture Decisions

| Decision | Choice | Alternative considered | Rationale |
|----------|--------|------------------------|-----------|
| Hint copy storage | Two independent dictionary keys (`register.passwordHint`, `resetPassword.passwordHint`), literal string duplicated | One shared TS constant referenced by both | Precedent exists: `register.errorPasswordPolicy`/`resetPassword.errorPasswordPolicy` already hold the exact same string as two independent literals, not a shared constant — every `auth.ts` key is per-surface even when identical. The two objects have no cross-imports today; a shared constant would be the first such coupling and could entangle copy that may reasonably diverge later. Duplication (2 lines) beats hidden coupling. |
| Hint element markup | `<p className="text-sm text-muted-foreground">{hint}</p>`, no `role="alert"`, after `Input`, before the conditional error `<p>` | New `<HelperText>` component | No helper-text primitive exists under `apps/web/components/ui/`; the app-wide muted-copy convention (`status-panel.tsx:22`, `card.tsx:53`, `alert-dialog.tsx:98`) is exactly this class on a plain `<p>`. Mirrors the sibling error pattern (`text-sm text-destructive`) but omits `role="alert"` since it's static, not a validation result. A component for one string is unwarranted abstraction. |
| `validateRegisterForm` signature | Add required 3rd param `confirmPassword: string`, mirroring `validateResetPasswordForm` | Optional param defaulting to `""` | `validateResetPasswordForm` treats both params as required, no default; matching keeps the two validators structurally identical. Single production call site (`RegisterForm.tsx:36`, grep-confirmed) plus existing `auth.test.ts` 2-arg calls (lines 11, 17, 24, 32) — both updated in the same commit (RED phase). |
| Assistive-tech association for hints/errors | Complete wiring on the **password-creation fields this change touches** only (register password + confirm, reset new-password + confirm): `aria-invalid` on error, `aria-describedby` pointing to the static hint on mount and switching to the error id on failure. | (a) Minimal: hint-only `aria-describedby`, no `aria-invalid`; (b) Retrofit every field/form site-wide | Minimal inverts the a11y priority — a screen-reader user most needs to know a field is *invalid* and *why*, not just hear a static hint; wiring the hint but not the error is half-done. The `Input` primitive already spreads `{...props}` (`input.tsx:14`) and ships `aria-invalid:` styling variants (`input.tsx:11`), so this is additive with zero component change and no test breakage (existing tests query `getByLabelText`/`getByRole`, which `aria-describedby` does not alter). Scoped to password fields (the subject of recs 8/10) — email/login fields keep today's `role="alert"`-only pattern and are left for a future consistency pass, keeping this PR focused. No prior form uses `aria-describedby`; this establishes the complete pattern where we already work. **On error, `aria-describedby` points ONLY to the error id (not hint + error): the hint and the policy-error copy are byte-identical, so referencing both would make a screen reader announce the same sentence twice — the error text alone conveys the policy.** |

## Data Flow

Independent checks, so a weak password AND a mismatch can both flag in
one submit:

    Input(password) ──┐
                       ├─▶ validate*Form(email?, password, confirmPassword) ─▶ FieldErrors
    Input(confirm)  ───┘        ├─ policy fail → errors.password / .newPassword
                                 └─ mismatch    → errors.confirmPassword
    (hint <p> renders unconditionally, independent of FieldErrors)

No network call happens until `Object.keys(errors).length === 0`
(unchanged control flow in both forms).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/lib/validation/auth.ts` | Modify | `validateRegisterForm` gains `confirmPassword` param + mismatch check; `RegisterFormErrors` gains `confirmPassword?` |
| `apps/web/components/auth/RegisterForm.tsx` | Modify | `confirmPassword` state, confirm `Input` block, hint `<p>`, updated validator call |
| `apps/web/components/auth/ResetPasswordForm.tsx` | Modify | Hint `<p>` under new-password field only |
| `apps/web/dictionaries/es/auth.ts` | Modify | +4 keys (see below) |
| `apps/web/lib/validation/auth.test.ts` | Modify | Update 2-arg `validateRegisterForm` calls to 3-arg; add mismatch cases |
| `apps/web/components/auth/RegisterForm.test.tsx` | Modify | Fill confirm field in happy-path tests; new mismatch-blocks-submit test |
| `apps/web/components/auth/ResetPasswordForm.test.tsx` | Modify | Add hint-visible-on-mount assertion |

## Interfaces / Contracts

```ts
// apps/web/lib/validation/auth.ts
export interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string; // NEW
}

export function validateRegisterForm(
  email: string,
  password: string,
  confirmPassword: string, // NEW — required, no default
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  if (!isValidEmail(email)) {
    errors.email = authDictionary.register.errorInvalidEmail;
  }
  if (!PASSWORD_POLICY.test(password)) {
    errors.password = authDictionary.register.errorPasswordPolicy;
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = authDictionary.register.errorPasswordMismatch;
  }
  return errors;
}
```

New dictionary keys (`apps/web/dictionaries/es/auth.ts`), neutral Spanish
(no voseo), reusing exact `errorPasswordPolicy` wording for both hints:

```ts
register: {
  // ...existing keys unchanged
  confirmPasswordLabel: "Confirmar contraseña",       // NEW — matches resetPassword.confirmPasswordLabel verbatim
  errorPasswordMismatch: "Las contraseñas no coinciden.", // NEW — matches resetPassword.errorPasswordMismatch verbatim
  passwordHint:
    "La contraseña debe tener al menos 8 caracteres, con una letra y un número.", // NEW
},
resetPassword: {
  // ...existing keys unchanged
  passwordHint:
    "La contraseña debe tener al menos 8 caracteres, con una letra y un número.", // NEW
},
```

`RegisterForm.tsx` password field — full block after the a11y wiring
(replaces the current password `div`, `RegisterForm.tsx:98-113`). The hint
`<p>` gets a stable `id`; the error `<p>` gets a stable `id`; the `Input`
gains `aria-invalid` (error only) and `aria-describedby` (hint id on mount,
switching to the error id on failure):

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="register-password">
    {authDictionary.register.passwordLabel}
  </Label>
  <Input
    id="register-password"
    type="password"
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    aria-invalid={fieldErrors.password ? true : undefined}
    aria-describedby={
      fieldErrors.password
        ? "register-password-error"
        : "register-password-hint"
    }
  />
  <p id="register-password-hint" className="text-sm text-muted-foreground">
    {authDictionary.register.passwordHint}
  </p>
  {fieldErrors.password ? (
    <p id="register-password-error" role="alert" className="text-sm text-destructive">
      {fieldErrors.password}
    </p>
  ) : null}
</div>
```

`RegisterForm.tsx` confirm-field block (mirrors
`ResetPasswordForm.tsx:133-148`, inserted after the password `div`,
before `formError`). No hint — the confirm field has only the conditional
error, so `aria-describedby`/`aria-invalid` are error-only:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="register-confirm-password">
    {authDictionary.register.confirmPasswordLabel}
  </Label>
  <Input
    id="register-confirm-password"
    type="password"
    value={confirmPassword}
    onChange={(event) => setConfirmPassword(event.target.value)}
    aria-invalid={fieldErrors.confirmPassword ? true : undefined}
    aria-describedby={
      fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
    }
  />
  {fieldErrors.confirmPassword ? (
    <p id="register-confirm-password-error" role="alert" className="text-sm text-destructive">
      {fieldErrors.confirmPassword}
    </p>
  ) : null}
</div>
```

`ResetPasswordForm.tsx` gets the same treatment on the fields it touches:
the new-password field mirrors the register password block above with
`reset-password-` ids (hint `id="reset-password-hint"` sourced from
`resetPassword.passwordHint`, error `id="reset-password-new-error"`), and
the **existing** confirm field (`ResetPasswordForm.tsx:133-148`) gains the
error-only `aria-invalid`/`aria-describedby` wiring (error
`id="reset-password-confirm-error"`) to keep the form internally
consistent.

`handleSubmit` update (`RegisterForm.tsx:36`):
`validateRegisterForm(email, password, confirmPassword)`. Submit body
(`RegisterForm.tsx:47`) stays `{ email, password }` — `confirmPassword`
never reaches the API.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (validation) | Mismatch flags `confirmPassword` independent of weak-password flag | Vitest, mirrors `validateResetPasswordForm` cases (`auth.test.ts:70-90`) |
| Component (RegisterForm) | Mismatch blocks submit + shows inline error; hint visible pre-submit; password field `aria-describedby` references the hint id on mount, and `aria-invalid=true` + error id appended on validation failure | Vitest + Testing Library + MSW, mirrors `ResetPasswordForm.test.tsx:37-64` |
| Component (ResetPasswordForm) | Hint visible on first render; new-password field `aria-describedby` references the hint id on mount, `aria-invalid` toggles on error | Vitest + Testing Library |
| A11y association | Assert via the accessible description (e.g. Testing Library `toHaveAccessibleDescription`) and `aria-invalid`, not by asserting raw attribute strings | Keeps assertions behavior-oriented, not implementation-coupled |

No e2e/API/DB changes.

## Migration / Rollout

No migration required, no feature flag — ships behind existing routes.

## Open Questions

None — both decisions deferred from the proposal are resolved above.
