import { authDictionary } from "../../dictionaries/es/auth";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { shellDictionary } from "../../dictionaries/es/shell";
import { verifyDictionary } from "../../dictionaries/es/verify";

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
export type ApiErrorContext =
  | "login"
  | "register"
  | "review"
  | "confirm"
  | "anchor"
  | "forgotPassword"
  | "resetPassword"
  | "upload"
  | "verifyUpload";

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

  // A 400 here means the reset token didn't match a stored hash or its
  // expiry passed (spec: "Password Reset Token Single-Use and Expiry") —
  // never a validation-shape error, since the client already enforces the
  // password policy before submitting.
  if (context === "resetPassword") {
    if (status === 400) return authDictionary.resetPassword.errorInvalidToken;
  }

  // 413: the file exceeds the upload limit. The copy states no number
  // because the effective cap depends on the path: certification goes
  // through the Vercel proxy (about 4.5 MB request body), verification
  // calls the API directly (MAX_UPLOAD_BYTES). Other failures keep each
  // flow's own generic copy.
  if (context === "upload") {
    if (status === 413) return certifyDictionary.upload.errorTooLarge;
    return certifyDictionary.upload.errorGeneric;
  }

  if (context === "verifyUpload") {
    if (status === 413) return verifyDictionary.upload.errorTooLarge;
    return verifyDictionary.upload.errorGeneric;
  }

  return shellDictionary.errors.generic;
}
