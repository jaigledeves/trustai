import type { TrustRecordDetail } from "../../lib/api/types";

const POLL_INTERVAL_MS = 2000;

/**
 * Client-side give-up cap for the analysis window (spec: never a silent,
 * infinite poll). At {@link POLL_INTERVAL_MS} this is ~5 minutes — well
 * beyond a normal analyze-document job — after which the consumer surfaces
 * a "tardando más de lo esperado" state instead of polling forever.
 */
export const MAX_ANALYSIS_POLL_ATTEMPTS = 150;

type AnalysisPollInput = Pick<
  TrustRecordDetail,
  "state" | "aiSummary" | "analysisFailureReason"
>;

/**
 * True while the async analyze-document job is still running: the record is
 * DRAFT but has neither an `aiSummary` nor an `analysisFailureReason` yet.
 * This is the transitional window `POST /assets` opens (analysis is enqueued,
 * not synchronous) — the review form must NOT mount against this empty
 * snapshot, and the wizard must keep polling until it resolves one way or the
 * other (spec: "AI Analysis Display, Including Failure Visibility" — never a
 * silent DRAFT stall).
 */
export function isAnalysisPending(record: AnalysisPollInput | undefined): boolean {
  return (
    !!record &&
    record.state === "DRAFT" &&
    !record.aiSummary &&
    !record.analysisFailureReason
  );
}

/**
 * Pure polling decision for the analysis window — extracted (mirrors
 * `resolveAnchorRefetchInterval`) so the "when do we stop polling?" logic is
 * testable with zero mocks, independent of TanStack Query's timing. Poll
 * while analysis is pending; stop the moment the summary arrives, a failure
 * reason is recorded, the record leaves DRAFT, or the attempt cap is hit
 * (a genuinely stuck job must not poll forever).
 */
export function resolveAnalysisRefetchInterval(
  record: AnalysisPollInput | undefined,
  attempts: number,
): number | false {
  if (!isAnalysisPending(record)) {
    return false;
  }
  return attempts >= MAX_ANALYSIS_POLL_ATTEMPTS ? false : POLL_INTERVAL_MS;
}
