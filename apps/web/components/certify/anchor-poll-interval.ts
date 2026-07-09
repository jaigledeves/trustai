import type { TrustRecordState } from "../../lib/api/types";

const POLL_INTERVAL_MS = 3000;

/**
 * Client-side give-up cap (spec: never hammer the API forever). At
 * {@link POLL_INTERVAL_MS} this is ~10 minutes of polling — generous enough
 * to ride out at least one backend confirm-anchor timeout/retry cycle
 * (~10 min), after which the consumer surfaces a "tardando más de lo
 * esperado" state instead of polling indefinitely against a stuck job.
 */
export const MAX_ANCHOR_POLL_ATTEMPTS = 200;

/**
 * Pure polling decision (spec: "Anchor Submission and Polling") — extracted
 * so the highest-risk logic in this slice (when do we stop hammering the
 * API?) is testable with zero mocks, independent of TanStack Query's
 * timing machinery. `AnchorPoller` passes this straight into `useTrustRecord`'s
 * `refetchInterval` function form.
 *
 * Keeps polling while ANCHORING OR FAILED: FAILED is NOT terminal — the
 * backend (confirm-anchor.handler) writes ANCHORING->FAILED then immediately
 * FAILED->ANCHORING and re-enqueues, so the UI must keep polling through
 * FAILED to advance to CERTIFIED after the automatic retry. Stops once the
 * attempt cap is hit so a genuinely stuck job doesn't poll forever.
 */
export function resolveAnchorRefetchInterval(
  state: TrustRecordState | undefined,
  attempts: number,
): number | false {
  if (attempts >= MAX_ANCHOR_POLL_ATTEMPTS) {
    return false;
  }
  return state === "ANCHORING" || state === "FAILED" ? POLL_INTERVAL_MS : false;
}
