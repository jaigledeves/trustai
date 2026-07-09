const HEALTH_CHECK_TIMEOUT_MS = 3_000;

/**
 * Best-effort check used to skip golden-path e2e specs gracefully when the
 * real NestJS API isn't running (mirrors `apps/api/test/utils/db-availability.ts`'s
 * rationale) — these specs need a real backend, not a mock, but must not
 * hard-fail the whole Playwright run in environments where `apps/api`
 * simply isn't up.
 */
export async function isApiAvailable(
  apiBaseUrl: string = process.env["E2E_API_BASE_URL"] ?? "http://localhost:3000",
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
