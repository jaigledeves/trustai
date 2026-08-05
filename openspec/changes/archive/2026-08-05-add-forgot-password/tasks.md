# Tasks: Forgot / Reset Password

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750–950 (full-stack: migration, 2 use cases + specs, adapters, e2e, 2 web pages/forms + tests, dictionary) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (api core: schema+domain+ports+adapters) → PR2 (api use cases+tests) → PR3 (api endpoints+e2e) → PR4 (web validation+dictionary+errors) → PR5 (web forms+pages+tests) |
| Delivery strategy | ask-on-risk (default — not overridden) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migration + `User` entity/ports/adapters (no use cases wired yet) | PR 1 | Base: `feat/forgot-password`. Independently testable via existing repo/adapter specs |
| 2 | `ForgotPasswordUseCase` + `ResetPasswordUseCase` + unit specs | PR 2 | Depends on Unit 1 |
| 3 | DTOs + `AuthController`/`AuthModule` wiring + `S-AUTH-14+` e2e | PR 3 | Depends on Unit 2 |
| 4 | Web: `validateForgotPasswordForm`/`validateResetPasswordForm`, dictionary keys, `errors.ts` | PR 4 | Independent of api once contract is known |
| 5 | Web: pages, forms, `LoginForm` link, component tests | PR 5 | Depends on Unit 4 |

## Phase 1: Schema & Domain (api, migration first)

- [x] 1.1 Add `passwordResetToken String?` + `passwordResetExpiresAt DateTime?` to `User` in `prisma/schema.prisma` (do NOT run `migrate dev` yet)
- [x] 1.2 RED: add failing test for `User.hasValidPasswordResetToken(hash)` in `user.entity.spec.ts` (create if absent, mirror `hasValidVerificationToken` cases)
- [x] 1.3 GREEN: add the 2 fields + `hasValidPasswordResetToken` to `user.entity.ts`
- [x] 1.4 Add `findByPasswordResetToken`, `setPasswordResetToken`, `resetPassword` to `UserRepositoryPort`
- [x] 1.5 RED: extend `PrismaUserRepository` tests (or a new spec) for the 3 new methods
- [x] 1.6 GREEN: implement the 3 methods in `PrismaUserRepository` (`resetPassword` sets `passwordHash`, clears both reset columns, sets `emailVerified = true`)
- [x] 1.7 Add `sendPasswordResetEmail(email, rawToken)` to `NotificationPort`
- [x] 1.8 Implement it in `StubNotificationAdapter` (mirror `sendVerificationEmail` log format)

## Phase 2: Use Cases (api, TDD RED→GREEN per case)

- [x] 2.1 RED: `forgot-password.use-case.spec.ts` — registered email generates token+notifies; unknown email is a silent no-op; both paths resolve without throwing
- [x] 2.2 GREEN: `forgot-password.use-case.ts` (`PASSWORD_RESET_TOKEN_TTL_MS = 24h`, mirrors `RegisterUseCase`)
- [x] 2.3 RED: `reset-password.use-case.spec.ts` — valid token resets + verifies email; expired/unknown token throws `BadRequestException`
- [x] 2.4 GREEN: `reset-password.use-case.ts`

## Phase 3: Endpoints & E2E (api)

- [x] 3.1 Add `forgot-password.dto.ts` (`email: IsEmail`)
- [x] 3.2 Add `reset-password.dto.ts` (`token: IsString`, `newPassword` same regex as `RegisterDto`)
- [x] 3.3 Add `POST /auth/forgot-password` (`@HttpCode(200)`, always `{ ok: true }`) to `AuthController`
- [x] 3.4 Add `POST /auth/reset-password` to `AuthController`
- [x] 3.5 Register both use cases as providers in `AuthModule`
- [x] 3.6 Extend `auth.e2e-spec.ts`: `S-AUTH-14` (happy path forgot→reset→login), `S-AUTH-15` (unknown email still 200), `S-AUTH-16` (expired/reused token → 400), `S-AUTH-17` (weak password → 400), `S-AUTH-18` (reset sets `emailVerified=true`)

## Phase 4: Web Validation & Copy

- [x] 4.1 Add `forgotPassword` + `resetPassword` groups to `dictionaries/es/auth.ts`; add `login.forgotPasswordLink`
- [x] 4.2 Add `validateForgotPasswordForm`, `validateResetPasswordForm` (incl. confirm-password match) to `lib/validation/auth.ts`
- [x] 4.3 Extend `ApiErrorContext` with `"forgotPassword" | "resetPassword"`; add `resetPassword` 400 branch in `mapApiError`

## Phase 5: Web Pages & Forms

- [x] 5.1 `ForgotPasswordForm.tsx` (email → `POST /api/backend/auth/forgot-password`, always shows enumeration-safe success)
- [x] 5.2 `app/(auth)/forgot-password/page.tsx` (mirrors `register/page.tsx` Card structure)
- [x] 5.3 `ResetPasswordForm.tsx` (newPassword+confirm → `POST /api/backend/auth/reset-password`; success → `/login` link; 400 → error + `/forgot-password` link)
- [x] 5.4 `app/(auth)/reset-password/page.tsx` (Server Component shell reading `searchParams.token`, mirrors `verify-email/page.tsx`)
- [x] 5.5 Add "¿Olvidaste tu contraseña?" link to `LoginForm.tsx`
- [x] 5.6 Component tests for both new forms (mirror `LoginForm.test.tsx`/`RegisterForm.test.tsx`)
