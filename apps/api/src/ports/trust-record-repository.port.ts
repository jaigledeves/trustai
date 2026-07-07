import type { TrustRecord } from "../domain/trust-record.entity";

export const TRUST_RECORD_REPOSITORY_PORT = Symbol("TrustRecordRepositoryPort");

export interface AiAnalysisUpdateFields {
  aiSummary: string;
  aiClassification: string;
  aiLanguage: string;
  aiProvider: string;
  aiModel: string;
  aiModelVersion: string;
  aiPromptVersion: string;
  aiTaxonomyVersion: string;
  aiAnalyzedAt: Date;
}

export interface TrustRecordRepositoryPort {
  /**
   * Unscoped by organizationId: `TrustRecord` has no `organizationId`
   * column of its own (it's reached only via `DigitalAsset`). Used today
   * by internal job handlers operating on ids already validated at
   * enqueue time. Phase 5 extends this port with org-scoped read methods
   * for the HTTP-facing trust-records controller — extend, don't replace.
   */
  findById(id: string): Promise<TrustRecord | null>;

  /**
   * Writes all AI fields + provenance atomically in one call — the caller
   * (AnalyzeDocumentHandler) only invokes this after every validation step
   * has already succeeded, so no partial/invalid state is ever persisted
   * (ai-document-analysis spec: "Provider Failure Handling"). The INV-21
   * DRAFT-only guard is the caller's responsibility
   * (`TrustRecordStateMachine.assertMutableAiFields`) before calling this.
   */
  updateAiAnalysis(id: string, fields: AiAnalysisUpdateFields): Promise<void>;
}
