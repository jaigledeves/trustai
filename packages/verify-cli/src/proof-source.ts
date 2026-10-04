import type { ProofFetchResult } from "@trustai/dtr-core";

/** Same budget as the chain reads: a silent API never hangs the check. */
export const PROOF_FETCH_TIMEOUT_MS = 10_000;

/** 409 `reason` the API sends for a dtr-1 record (ADR-016). */
const LEGACY_REFUSAL_REASON = "legacy_record";

/** Named like the DOMException `AbortSignal.timeout` produces, which the orchestrator maps to `proof_timeout`. */
export class ProofFetchTimeoutError extends Error {
  constructor(message = "The proof package request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function proofPackageUrl(apiBaseUrl: string, id: string): string {
  return `${apiBaseUrl.replace(/\/+$/, "")}/public/verify/${encodeURIComponent(id)}/proof`;
}

/**
 * Downloads the public proof package (`GET /public/verify/:id/proof`). 404 and
 * 409 resolve to typed results; any other non-2xx and network errors reject,
 * and a timeout rejects with a `TimeoutError`. The body is left unvalidated:
 * the orchestrator parses it with dtr-core's strict schema.
 */
export async function fetchProofFromApi(
  apiBaseUrl: string,
  id: string,
  fetchImpl: typeof fetch,
  timeoutMs: number = PROOF_FETCH_TIMEOUT_MS,
): Promise<ProofFetchResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(proofPackageUrl(apiBaseUrl, id), { signal, headers: { accept: "application/json" } });
  } catch (error) {
    if (signal.aborted) throw new ProofFetchTimeoutError();
    throw error;
  }

  if (response.status === 404) return { status: "not_found" };
  if (response.status === 409) {
    const body = (await response.json().catch(() => null)) as { reason?: unknown } | null;
    return body?.reason === LEGACY_REFUSAL_REASON ? { status: "legacy" } : { status: "unavailable" };
  }
  if (!response.ok) throw new Error(`Proof request failed with status ${response.status}`);
  return { status: "ok", body: (await response.json()) as unknown };
}
