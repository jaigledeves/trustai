import { describe, expect, it } from "vitest";
import { AiAnalysisOutputSchema } from "../../ports/ai-analysis.port";
import { StubAiAnalysisAdapter } from "./stub.adapter";

describe("StubAiAnalysisAdapter (AiAnalysisPort)", () => {
  it("produces an analysis that validates against the shared TrustRecordV1 analysis schema", async () => {
    const adapter = new StubAiAnalysisAdapter();

    const { analysis } = await adapter.analyze("some extracted PDF text");

    const parsed = AiAnalysisOutputSchema.safeParse(analysis);
    expect(parsed.success).toBe(true);
  });

  it("is deterministic: the same canned output regardless of input text", async () => {
    const adapter = new StubAiAnalysisAdapter();

    const first = await adapter.analyze("first document's extracted text");
    const second = await adapter.analyze("a completely different second document");

    expect(first.analysis).toEqual(second.analysis);
    expect(first.provenance).toEqual(second.provenance);
  });

  it("returns fully populated provenance (RF-025/INV-26: mandatory before READY)", async () => {
    const adapter = new StubAiAnalysisAdapter();

    const { provenance } = await adapter.analyze("some extracted PDF text");

    expect(provenance.provider).toBeTruthy();
    expect(provenance.model).toBeTruthy();
    expect(provenance.modelVersion).toBeTruthy();
    expect(provenance.promptVersion).toBeTruthy();
    expect(provenance.taxonomyVersion).toBe("v1");
  });
});
