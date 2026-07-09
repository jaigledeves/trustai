import { describe, expect, it } from "vitest";
import type { TrustRecordDetail } from "../../lib/api/types";
import { isAnalysisPending, resolveAnalysisRefetchInterval } from "./analysis-poll-interval";

type AnalysisPollInput = Pick<
  TrustRecordDetail,
  "state" | "aiSummary" | "analysisFailureReason"
>;

function record(overrides: Partial<AnalysisPollInput> = {}): AnalysisPollInput {
  return { state: "DRAFT", aiSummary: null, analysisFailureReason: null, ...overrides };
}

describe("isAnalysisPending / resolveAnalysisRefetchInterval (pure — spec: AI Analysis Display, never a silent DRAFT stall)", () => {
  it("polls every 2000ms while DRAFT with no summary and no failure reason (job still running)", () => {
    expect(isAnalysisPending(record())).toBe(true);
    expect(resolveAnalysisRefetchInterval(record())).toBe(2000);
  });

  it("stops polling once the summary arrives", () => {
    const r = record({ aiSummary: "Resumen generado por IA." });
    expect(isAnalysisPending(r)).toBe(false);
    expect(resolveAnalysisRefetchInterval(r)).toBe(false);
  });

  it("stops polling once a failure reason is recorded (scanned PDF, no text layer)", () => {
    const r = record({ analysisFailureReason: "no extractable text layer" });
    expect(isAnalysisPending(r)).toBe(false);
    expect(resolveAnalysisRefetchInterval(r)).toBe(false);
  });

  it("does not poll once the record leaves DRAFT (e.g. confirmed to READY)", () => {
    const r = record({ state: "READY", aiSummary: "Resumen." });
    expect(isAnalysisPending(r)).toBe(false);
    expect(resolveAnalysisRefetchInterval(r)).toBe(false);
  });

  it("does not poll for an undefined record (no data yet)", () => {
    expect(isAnalysisPending(undefined)).toBe(false);
    expect(resolveAnalysisRefetchInterval(undefined)).toBe(false);
  });
});
