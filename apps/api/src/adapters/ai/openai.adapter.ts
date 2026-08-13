import { Injectable, Logger } from "@nestjs/common";
import { DOCUMENT_TAXONOMY_V1 } from "@trustai/dtr-core";
import OpenAI from "openai";
import type { AiAnalysisPort, AiAnalysisRawResult } from "../../ports/ai-analysis.port";

// Cheapest tier for the pilot (~€0.002/DTR) — chosen as the safe default so
// a public-repo deployment that forgets to set OPENAI_MODEL still lands on the
// low-cost model instead of the pricier mini. Override via OPENAI_MODEL.
const DEFAULT_MODEL = "gpt-5.4-nano";
const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = [
  "Analizas el texto extraído de un documento para una plataforma de certificación legal y empresarial.",
  "Genera un resumen conciso (de 1 a 3 frases, con un máximo de 1200 caracteres), clasifica el documento",
  `en exactamente una de las siguientes categorías: ${DOCUMENT_TAXONOMY_V1.join(", ")}, e identifica`,
  "el idioma utilizando el código ISO 639-1 de dos letras. Sé estrictamente fiel al contenido del documento y no inventes información que no aparezca en el texto.",
].join(" ");

/**
 * Hand-written mirror of dtr-core's `TrustRecordV1Schema.shape.analysis`
 * (deliberately NOT generated via openai's `zodResponseFormat` helper).
 *
 * `zodResponseFormat` requires a `ZodType` from `zod/v3` or `zod/v4`
 * (openai@6's `helpers/zod.d.ts`). This project's installed zod (3.25.x)
 * is a transitional release bundling both a top-level classic-v3 API and a
 * separate `zod/v3`/`zod/v4` compat-subpath implementation — passing
 * dtr-core's schema (built against the top-level import) into
 * `zodResponseFormat` hits a genuine structural type mismatch between
 * those two internally-distinct `ZodObject`/`ZodEffects` shapes
 * ("Type instantiation is excessively deep", verified empirically, not a
 * guess). Fixing it properly would mean bumping zod to a stable v4 across
 * both `apps/api` and `@trustai/dtr-core` — a shared-package version bump
 * outside this phase's scope and a real risk to `dtr-core`'s
 * canonicalization/hashing code paths (ADR-001 schema discipline).
 *
 * Per this change's "prefer the lower-risk option" principle: this is a
 * ~10-line hand-written JSON Schema, validated against the exact same
 * `AiAnalysisOutputSchema` on the way back in (`AnalyzeDocumentHandler`
 * always re-validates — see ports/ai-analysis.port.ts's doc comment), so
 * a mismatch here would surface immediately as a schema-validation
 * failure rather than silently drifting.
 */
const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 1200 },
    classification: { type: "string", enum: [...DOCUMENT_TAXONOMY_V1] },
    language: { type: "string", pattern: "^[a-z]{2}$" },
  },
  required: ["summary", "classification", "language"],
  additionalProperties: false,
} as const;

export class OpenAiRefusalError extends Error {
  constructor(reason: string) {
    super(`OpenAI refused to analyze the document: ${reason}`);
    this.name = "OpenAiRefusalError";
  }
}

export class MissingOpenAiApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured (required when AI_ADAPTER=openai)");
    this.name = "MissingOpenAiApiKeyError";
  }
}

export interface OpenAiAnalysisAdapterConfig {
  apiKey: string;
  model?: string;
}

/**
 * Real `AiAnalysisPort` adapter (design.md "First real AI adapter"
 * decision): OpenAI structured outputs (`response_format: json_schema`,
 * `strict: true`) constrain the model at the API level to the exact same
 * `AiAnalysisOutputSchema` shape the stub adapter satisfies (contract
 * parity — ai-document-analysis spec).
 */
@Injectable()
export class OpenAiAnalysisAdapter implements AiAnalysisPort {
  private readonly logger = new Logger(OpenAiAnalysisAdapter.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAiAnalysisAdapterConfig) {
    if (!config.apiKey) {
      throw new MissingOpenAiApiKeyError();
    }
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async analyze(text: string): Promise<AiAnalysisRawResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_analysis",
          strict: true,
          schema: ANALYSIS_JSON_SCHEMA,
        },
      },
    });

    const message = completion.choices[0]?.message;
    if (message?.refusal) {
      throw new OpenAiRefusalError(message.refusal);
    }
    if (!message?.content) {
      throw new Error("OpenAI returned no content for the analysis request");
    }

    // `unknown` per AiAnalysisPort contract — the caller
    // (AnalyzeDocumentHandler) re-validates against AiAnalysisOutputSchema
    // as the single centralized validation choke point (see that port's
    // doc comment). A JSON.parse failure here is itself a form of
    // "provider returned an invalid response" and propagates the same way.
    const analysis: unknown = JSON.parse(message.content);

    this.logger.log(`Analyzed ${text.length} characters via ${completion.model}`);

    return {
      analysis,
      provenance: {
        provider: "openai",
        // `this.model` is the configured alias (e.g. "gpt-5.4-nano");
        // `completion.model` is the exact snapshot OpenAI actually resolved
        // it to — kept distinct so provenance records precisely which
        // model version produced this analysis.
        model: this.model,
        modelVersion: completion.model,
        promptVersion: PROMPT_VERSION,
        taxonomyVersion: "v1",
      },
    };
  }
}
