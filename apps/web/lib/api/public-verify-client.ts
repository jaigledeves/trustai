import { config } from "../config";
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
 * genuinely unexpected non-2xx (network/5xx/throttling) throws here.
 */
export async function postVerifyUpload(id: string, file: File): Promise<VerifyUploadResponse> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(`${config.publicApiBaseUrl}/public/verify/${id}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as VerifyUploadResponse;
}
