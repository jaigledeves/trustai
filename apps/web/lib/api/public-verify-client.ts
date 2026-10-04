import { config } from "../config";
import { ApiError } from "./errors";
import type { VerifyHashResponse, VerifyUploadResponse } from "./types";

/**
 * Thrown by `getVerifyHash` on a 404 — the ONLY place this client ever
 * throws it. `postVerifyUpload` deliberately does not have an equivalent
 * "not found" throw (spec: "INVALID_RECORD via POST on unknown id" — GET
 * 404s an unresolved id, POST never does; it resolves 200 with
 * `verdict: "INVALID_RECORD"` instead, design.md "GET vs POST 404
 * asymmetry"). Callers must branch on `body.verdict`, never on status code,
 * for the POST path.
 */
export class NotFoundError extends Error {
  constructor(message = "Trust record not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Direct, no-auth fetch to `NEXT_PUBLIC_API_BASE_URL` (design.md: "Public
 * verify calls the API directly client-side (no auth, CORS already
 * enabled) — no proxy needed"). Works identically from a Server Component
 * (the hash-only landing card) or a Client Component (the upload panel).
 */
export async function getVerifyHash(id: string): Promise<VerifyHashResponse> {
  const response = await fetch(`${config.publicApiBaseUrl}/public/verify/${id}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new NotFoundError();
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as VerifyHashResponse;
}

/**
 * Always resolves — never throws on a semantically-missing record (that
 * comes back as a normal 200 with `verdict: "INVALID_RECORD"`). Only a
 * genuinely unexpected non-2xx (413/5xx/throttling) throws here, as an
 * `ApiError` carrying the status so the UI can map it. A network failure
 * still rejects with fetch's own TypeError, not an `ApiError`.
 */
export async function postVerifyUpload(id: string, file: File): Promise<VerifyUploadResponse> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(`${config.publicApiBaseUrl}/public/verify/${id}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }

  return (await response.json()) as VerifyUploadResponse;
}

/**
 * Outcome of `GET /public/verify/:id/proof` (ADR-016). The body is returned
 * unvalidated on purpose: the independent verifier parses it with dtr-core's
 * strict `ProofPackageV1Schema`, so the check never depends on this client.
 */
export type ProofFetchResult =
  | { status: "ok"; body: unknown }
  | { status: "not_found" }
  /** 409 for a dtr-1 record: verified by the server only, no proof package. */
  | { status: "legacy" }
  /** Any other 409: not anchored yet, or no package can be produced. */
  | { status: "unavailable" };

/**
 * The API's 409 body does not carry a machine-readable reason, only the
 * NestJS `message`. The dtr-1 refusal is the only one that names "dtr-1"
 * (`PROOF_REFUSALS.legacy_record` in the public-verification controller).
 */
const LEGACY_REFUSAL_MARKER = "dtr-1";

export function proofPackageUrl(id: string): string {
  return `${config.publicApiBaseUrl}/public/verify/${encodeURIComponent(id)}/proof`;
}

/** Link for the "download proof (JSON)" action: the API adds an attachment disposition. */
export function proofPackageDownloadUrl(id: string): string {
  return `${proofPackageUrl(id)}?download=1`;
}

/**
 * Fetches the public proof package. 404 and 409 resolve to typed results;
 * any other non-2xx throws an `ApiError`, and a network failure rejects with
 * fetch's own error.
 */
export async function getProofPackage(id: string): Promise<ProofFetchResult> {
  const response = await fetch(proofPackageUrl(id), { cache: "no-store" });

  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (response.status === 409) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof body?.message === "string" ? body.message : "";
    return message.includes(LEGACY_REFUSAL_MARKER) ? { status: "legacy" } : { status: "unavailable" };
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }

  return { status: "ok", body: (await response.json()) as unknown };
}
