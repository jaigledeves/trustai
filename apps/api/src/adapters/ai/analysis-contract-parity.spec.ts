import { describe, expect, it } from "vitest";
import { AiAnalysisOutputSchema } from "../../ports/ai-analysis.port";
import { OpenAiAnalysisAdapter } from "./openai.adapter";
import { StubAiAnalysisAdapter } from "./stub.adapter";

const openAiApiKey = process.env["OPENAI_API_KEY"];

/**
 * ai-document-analysis spec: "OpenAI adapter output satisfies the same
 * contract" — the same test suite runs both adapters against the exact
 * same `AiAnalysisOutputSchema` (dtr-core's `TrustRecordV1Schema.shape.analysis`).
 * The OpenAI leg is API-key-gated (D7-style service gating): it skips
 * gracefully — not a failure — when `OPENAI_API_KEY` isn't configured,
 * same pattern as `isDatabaseAvailable`/`isStorageAvailable`.
 */
describe("AiAnalysisPort contract parity (stub vs OpenAI)", () => {
  it("stub adapter output satisfies AiAnalysisOutputSchema", async () => {
    const stub = new StubAiAnalysisAdapter();

    const { analysis } = await stub.analyze("Sample extracted text for contract parity check.");

    const parsed = AiAnalysisOutputSchema.safeParse(analysis);
    expect(parsed.success).toBe(true);
  });

  it("the shared schema's shape hasn't silently drifted from what openai.adapter.ts's hand-written JSON schema mirrors (summary/classification/language)", () => {
    // Tripwire for the "OpenAI adapter's JSON schema is a hand-written
    // mirror, not generated from the Zod schema" risk documented in
    // openai.adapter.ts — if dtr-core ever adds/renames/removes a field
    // on TrustRecordV1Schema.shape.analysis, this fails loudly instead of
    // the mirror silently drifting out of sync.
    expect(Object.keys(AiAnalysisOutputSchema.shape).sort()).toEqual([
      "classification",
      "language",
      "summary",
    ]);
  });

  describe.skipIf(!openAiApiKey)("OpenAI adapter (live API call)", () => {
    it("output satisfies the exact same AiAnalysisOutputSchema the stub satisfies", async () => {
      const openai = new OpenAiAnalysisAdapter({ apiKey: openAiApiKey! });

      const { analysis, provenance } = await openai.analyze(
        "This is a services agreement between Acme Corp and Beta LLC dated January 2026, " +
          "outlining payment terms of ten thousand euros due net 30 days.",
      );

      const parsed = AiAnalysisOutputSchema.safeParse(analysis);
      expect(parsed.success).toBe(true);
      expect(provenance.provider).toBe("openai");
      expect(provenance.model).toBeTruthy();
      expect(provenance.modelVersion).toBeTruthy();
      expect(provenance.promptVersion).toBeTruthy();
      expect(provenance.taxonomyVersion).toBe("v1");
    });
  });
});
