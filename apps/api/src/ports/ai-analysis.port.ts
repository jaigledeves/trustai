import { TrustRecordV1Schema } from "@trustai/dtr-core";
import type { z } from "zod";

export const AI_ANALYSIS_PORT = Symbol("AiAnalysisPort");

/**
 * Reuses dtr-core's `TrustRecordV1Schema.shape.analysis` as-is (design.md
 * "AI contract schema" decision) instead of a new standalone schema in
 * apps/api — one schema shared by every `AiAnalysisPort` adapter (stub,
 * OpenAI in Phase 4) *and* a guarantee that whatever the AI produces is
 * always shape-compatible with what gets embedded in the DTR at hash time.
 */
export const AiAnalysisOutputSchema = TrustRecordV1Schema.shape.analysis;
export type AiAnalysisOutput = z.infer<typeof AiAnalysisOutputSchema>;

/**
 * RF-025/INV-26 mandatory provenance, minus `analyzedAt` — that timestamp
 * is stamped by the caller (AnalyzeDocumentHandler) at write time, not
 * known by the adapter itself.
 */
export interface AiAnalysisProvenance {
  provider: string;
  model: string;
  modelVersion: string;
  promptVersion: string;
  taxonomyVersion: "v1";
}

export interface AiAnalysisRawResult {
  /**
   * Untrusted/unvalidated. The caller (AnalyzeDocumentHandler) is
   * responsible for validating this against `AiAnalysisOutputSchema`
   * before treating it as trustworthy (ai-document-analysis spec:
   * "GIVEN the provider responds with JSON that fails Zod validation
   * WHEN AnalyzeDocument validates the response THEN the job is rejected
   * as a failure") — this keeps validation centralized in one place
   * regardless of which adapter (stub/OpenAI) produced the data.
   */
  analysis: unknown;
  provenance: AiAnalysisProvenance;
}

export interface AiAnalysisPort {
  analyze(text: string): Promise<AiAnalysisRawResult>;
}
