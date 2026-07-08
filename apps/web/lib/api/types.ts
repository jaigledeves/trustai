/**
 * DTOs mirrored 1:1 from `apps/api`'s response shapes. This file grows
 * per-slice (design.md) — Phase 1 only needs auth.
 */

/** Mirrors `LoginResult` (apps/api/src/application/auth/login.use-case.ts). */
export interface LoginResponse {
  accessToken: string;
}

/** Mirrors `RegisterResult` (apps/api/src/application/auth/register.use-case.ts). No token — no auto-login. */
export interface RegisterResponse {
  userId: string;
  organizationId: string;
}
