import { Inject, Injectable, Logger } from "@nestjs/common";
import { TrustRecordStateMachine } from "../../../domain/trust-record.entity";
import {
  AI_ANALYSIS_PORT,
  AiAnalysisOutputSchema,
  type AiAnalysisPort,
} from "../../../ports/ai-analysis.port";
import {
  DIGITAL_ASSET_REPOSITORY_PORT,
  type DigitalAssetRepositoryPort,
} from "../../../ports/digital-asset-repository.port";
import { ENCRYPTION_PORT, type EncryptionPort } from "../../../ports/encryption.port";
import { STORAGE_PORT, type StoragePort } from "../../../ports/storage.port";
import {
  TEXT_EXTRACTION_PORT,
  type TextExtractionPort,
} from "../../../ports/text-extraction.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../../ports/trust-record-repository.port";

/** design.md "pg-boss Jobs" table. Shared by the producer (UploadAssetUseCase) and consumer (JobRegistrationService) so both agree on the exact queue name. */
export const ANALYZE_DOCUMENT_QUEUE = "analyze-document";

export interface AnalyzeDocumentJobPayload {
  trustRecordId: string;
  assetId: string;
  /**
   * `TrustRecord` has no `organizationId` column of its own (only reachable
   * via `DigitalAsset`), so it's carried on the job payload instead of
   * adding an org-unscoped lookup method to `DigitalAssetRepositoryPort`
   * just for this internal, already-trusted call site.
   */
  organizationId: string;
}

export class AiAnalysisValidationError extends Error {
  constructor(issues: string) {
    super(`AI provider returned schema-invalid analysis: ${issues}`);
    this.name = "AiAnalysisValidationError";
  }
}

/**
 * pg-boss `analyze-document` job handler — a pure function of ports (no
 * direct pg-boss/DB/HTTP dependency), unit-testable with fakes for every
 * collaborator (design.md "Job handlers ... pure functions of ports").
 *
 * Failure surfacing: any error thrown here (NoTextLayerError, a provider
 * timeout, or AiAnalysisValidationError) propagates to pg-boss, which marks
 * the job `failed` with that reason — this IS the visible failure state
 * (design.md "Analysis-failure visibility": no new TrustRecord column,
 * pg-boss's own job history is the durable source of truth). The record
 * itself is only ever written to via `updateAiAnalysis`, called exactly
 * once, only after every prior step has succeeded — so no failure path can
 * ever leave partial/invalid AI fields on the record.
 */
@Injectable()
export class AnalyzeDocumentHandler {
  private readonly logger = new Logger(AnalyzeDocumentHandler.name);

  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(DIGITAL_ASSET_REPOSITORY_PORT)
    private readonly digitalAssetRepository: DigitalAssetRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    @Inject(ENCRYPTION_PORT)
    private readonly encryption: EncryptionPort,
    @Inject(TEXT_EXTRACTION_PORT)
    private readonly textExtraction: TextExtractionPort,
    @Inject(AI_ANALYSIS_PORT)
    private readonly aiAnalysis: AiAnalysisPort,
  ) {}

  async handle(payload: AnalyzeDocumentJobPayload): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findById(payload.trustRecordId);
    if (!trustRecord) {
      throw new Error(`TrustRecord not found: ${payload.trustRecordId}`);
    }

    // Defense-in-depth (INV-21): analyze-document should only ever be
    // enqueued for a DRAFT record. Fail fast, before any I/O, if that's
    // somehow no longer true.
    TrustRecordStateMachine.assertMutableAiFields(trustRecord.state);

    const asset = await this.digitalAssetRepository.findById(
      payload.organizationId,
      payload.assetId,
    );
    if (!asset) {
      throw new Error(`DigitalAsset not found: ${payload.assetId}`);
    }

    const encryptedBytes = await this.storage.getObject(asset.storageRef);
    const plaintextBytes = await this.encryption.decrypt(encryptedBytes);

    // NoTextLayerError (RF-023: no OCR) propagates as-is — pg-boss marks the
    // job failed with that reason; the record stays untouched in DRAFT.
    const extractedText = await this.textExtraction.extractText(plaintextBytes);

    // Provider call failures (timeout/5xx) propagate the same way — no AI
    // fields are ever written before this point.
    const { analysis, provenance } = await this.aiAnalysis.analyze(extractedText);

    const parsed = AiAnalysisOutputSchema.safeParse(analysis);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      throw new AiAnalysisValidationError(issues);
    }

    await this.trustRecordRepository.updateAiAnalysis(payload.trustRecordId, {
      aiSummary: parsed.data.summary,
      aiClassification: parsed.data.classification,
      aiLanguage: parsed.data.language,
      aiProvider: provenance.provider,
      aiModel: provenance.model,
      aiModelVersion: provenance.modelVersion,
      aiPromptVersion: provenance.promptVersion,
      aiTaxonomyVersion: provenance.taxonomyVersion,
      aiAnalyzedAt: new Date(),
    });

    this.logger.log(`AI analysis written for TrustRecord ${payload.trustRecordId}`);
  }
}
