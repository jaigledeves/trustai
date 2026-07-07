import { Injectable, Logger } from "@nestjs/common";
import type { AiAnalysisPort, AiAnalysisRawResult } from "../../ports/ai-analysis.port";

/**
 * MVP stub: deterministic canned output, no real AI call. Used in unit
 * tests, CI, and as a demo contingency (proposal §Riesgos Plan B) — mirrors
 * `StubNotificationAdapter`'s pattern. Output is schema-valid by
 * construction (verified in stub.adapter.spec.ts against the shared
 * `AiAnalysisOutputSchema`, same schema the real OpenAI adapter must
 * satisfy in Phase 4).
 */
@Injectable()
export class StubAiAnalysisAdapter implements AiAnalysisPort {
  private readonly logger = new Logger(StubAiAnalysisAdapter.name);

  async analyze(text: string): Promise<AiAnalysisRawResult> {
    this.logger.log(`[STUB AiAnalysisPort] Analyzing ${text.length} extracted characters`);

    return {
      analysis: {
        summary:
          "Stub summary: deterministic canned output produced by StubAiAnalysisAdapter for tests/CI/demo contingency.",
        classification: "otro",
        language: "es",
      },
      provenance: {
        provider: "stub",
        model: "stub-deterministic",
        modelVersion: "1.0.0",
        promptVersion: "v1",
        taxonomyVersion: "v1",
      },
    };
  }
}
