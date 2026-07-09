import { authDictionary } from "../../dictionaries/es/auth";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { shellDictionary } from "../../dictionaries/es/shell";

/** Thrown by server-client/client-fetch on any non-2xx response. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Contexts this mapper knows about. Extended per-slice (3.2 adds
 * review/confirm/anchor context-specific 409 copy per design.md).
 */
export type ApiErrorContext = "login" | "register" | "review" | "confirm" | "anchor";

/**
 * Maps an HTTP status to Spanish, spec-grounded copy. `context` matters
 * because the same status means different things in different flows (e.g.
 * a login 401 is "wrong credentials", not a generic failure).
 */
export function mapApiError(status: number, context: ApiErrorContext): string {
  if (context === "login") {
    if (status === 401) return authDictionary.login.errorInvalidCredentials;
    if (status === 403) return authDictionary.login.errorUnverifiedEmail;
  }

  if (context === "register") {
    if (status === 409) return authDictionary.register.errorDuplicateEmail;
  }

  // INV-21: reviewing after DRAFT is a state conflict, not a validation
  // error — the caller must refresh, never show the edit as applied.
  if (context === "review") {
    if (status === 409) return certifyDictionary.review.editConflict;
  }

  if (context === "confirm") {
    if (status === 409) return certifyDictionary.confirm.errorGeneric;
  }

  if (context === "anchor") {
    if (status === 409) return certifyDictionary.anchor.errorGeneric;
  }

  return shellDictionary.errors.generic;
}
