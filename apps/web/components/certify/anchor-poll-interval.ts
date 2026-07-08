import type { TrustRecordState } from "../../lib/api/types";

const POLL_INTERVAL_MS = 3000;

/**
 * Pure polling decision (spec: "Anchor Submission and Polling") — extracted
 * so the highest-risk logic in this slice (when do we stop hammering the
 * API?) is testable with zero mocks, independent of TanStack Query's
 * timing machinery. `AnchorPoller` passes this straight into `useTrustRecord`'s
 * `refetchInterval` function form.
 */
export function resolveAnchorRefetchInterval(
  state: TrustRecordState | undefined,
): number | false {
  return state === "ANCHORING" ? POLL_INTERVAL_MS : false;
}
