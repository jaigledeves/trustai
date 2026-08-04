import { certifyDictionary } from "../../dictionaries/es/certify";
import type { TrustRecordDetail } from "../../lib/api/types";
import { isAnalysisPending } from "./analysis-poll-interval";
import { hasAnalysisFailed } from "./ReviewStep";

export type WizardStepId = "upload" | "analysis" | "review" | "anchor" | "certified";

export type WizardStepStatus = "complete" | "current" | "upcoming" | "error";

export interface WizardStepInfo {
  id: WizardStepId;
  label: string;
  status: WizardStepStatus;
}

type WizardStepRecord = Pick<
  TrustRecordDetail,
  "state" | "aiSummary" | "analysisFailureReason"
>;

/**
 * Step 2 (analysis): current while the async analyze-document job is still
 * running, error when it failed (spec: "Inline Failure State, Not a
 * Phantom Step"), complete once `aiSummary` is set.
 */
function resolveAnalysisStatus(record: WizardStepRecord): WizardStepStatus {
  if (isAnalysisPending(record)) return "current";
  if (hasAnalysisFailed(record)) return "error";
  return record.aiSummary ? "complete" : "upcoming";
}

/**
 * Step 3 (review): current only while DRAFT with a completed analysis
 * (spec scenario "Analysis complete, awaiting review shows step 3 active").
 * Any later state (READY/ANCHORING/CERTIFIED/FAILED) already passed
 * review to get there, so it's complete. DISCARDED never reached review
 * confirmation, so it stays upcoming.
 */
function resolveReviewStatus(record: WizardStepRecord): WizardStepStatus {
  if (record.state === "DRAFT") {
    if (isAnalysisPending(record) || hasAnalysisFailed(record)) return "upcoming";
    return record.aiSummary ? "current" : "upcoming";
  }
  if (record.state === "DISCARDED") return "upcoming";
  return "complete";
}

/**
 * Step 4 (anchor): current for READY (about to anchor) and ANCHORING
 * (in-progress, deliberately NOT complete — spec scenario "Anchoring shows
 * step 4 in progress"), error for FAILED (spec: "Anchor failure renders
 * inline on step 4"), complete once CERTIFIED.
 */
function resolveAnchorStatus(record: WizardStepRecord): WizardStepStatus {
  switch (record.state) {
    case "READY":
    case "ANCHORING":
      return "current";
    case "FAILED":
      return "error";
    case "CERTIFIED":
      return "complete";
    default:
      return "upcoming";
  }
}

function resolveCertifiedStatus(record: WizardStepRecord): WizardStepStatus {
  return record.state === "CERTIFIED" ? "complete" : "upcoming";
}

/**
 * Pure phase -> step-index mapping (design.md "Phase → step-index
 * mapping", spec: "Five-Step Progress Indicator"). No new state machine or
 * backend field — reuses `isAnalysisPending`/`hasAnalysisFailed`, the same
 * predicates the DRAFT branch already renders against. Always returns
 * exactly 5 steps; failures render inline within the step that owns that
 * phase instead of growing the indicator.
 */
export function resolveWizardSteps(record: WizardStepRecord): WizardStepInfo[] {
  return [
    { id: "upload", label: certifyDictionary.stepper.uploadLabel, status: "complete" },
    {
      id: "analysis",
      label: certifyDictionary.stepper.analysisLabel,
      status: resolveAnalysisStatus(record),
    },
    {
      id: "review",
      label: certifyDictionary.stepper.reviewLabel,
      status: resolveReviewStatus(record),
    },
    {
      id: "anchor",
      label: certifyDictionary.stepper.anchorLabel,
      status: resolveAnchorStatus(record),
    },
    {
      id: "certified",
      label: certifyDictionary.stepper.certifiedLabel,
      status: resolveCertifiedStatus(record),
    },
  ];
}
