import type { TrustRecord } from "../domain/trust-record.entity";
import type { TransactionHandle } from "./queue.port";

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

export interface ReviewFieldsUpdate {
  reviewedByUserId: string;
  /** Only fields the reviewer actually edited are included — partial patch. */
  aiSummary?: string;
  aiClassification?: string;
  aiLanguage?: string;
}

export interface ConfirmToReadyFields {
  canonicalHash: string;
  /** ISO 8601 UTC instant — matches dtr-core's `TrustRecordV1.issuedAt`. */
  issuedAt: string;
}

export interface TrustRecordRepositoryPort {
  /**
   * Unscoped by organizationId: `TrustRecord` has no `organizationId`
   * column of its own (it's reached only via `DigitalAsset`). Used today
   * by internal job handlers operating on ids already validated at
   * enqueue time (analyze-document). Never use this for an HTTP-facing
   * lookup — use `findByIdForOrganization` instead (RNF-004).
   */
  findById(id: string): Promise<TrustRecord | null>;

  /**
   * Phase 5: org-scoped lookup for the HTTP-facing trust-records
   * controller (`ConfirmReviewUseCase`, `DiscardDraftUseCase`). Joins
   * through `DigitalAsset.organizationId` at the query level (RNF-004) —
   * a record belonging to a different org behaves identically to a
   * missing one, so the controller can turn `null` into a 404 without
   * leaking existence across orgs.
   */
  findByIdForOrganization(organizationId: string, id: string): Promise<TrustRecord | null>;

  /**
   * Writes all AI fields + provenance atomically in one call — the caller
   * (AnalyzeDocumentHandler) only invokes this after every validation step
   * has already succeeded, so no partial/invalid state is ever persisted
   * (ai-document-analysis spec: "Provider Failure Handling"). The INV-21
   * DRAFT-only guard is the caller's responsibility
   * (`TrustRecordStateMachine.assertMutableAiFields`) before calling this.
   */
  updateAiAnalysis(id: string, fields: AiAnalysisUpdateFields): Promise<void>;

  /**
   * Phase 5: persists a reviewer's edit to AI fields + sets
   * `reviewedByUserId` (dtr-lifecycle/ai-document-analysis spec: "Reviewer
   * edits summary in DRAFT"). The INV-21 DRAFT-only guard is the caller's
   * responsibility. Only the fields present on `fields` are updated —
   * omitted fields are left untouched (partial patch, not full replace).
   */
  updateReviewFields(id: string, fields: ReviewFieldsUpdate): Promise<void>;

  /**
   * Phase 5: the DRAFT->READY transition's persistence — sets
   * `canonicalHash` and `issuedAt` and moves `state` to READY, all in one
   * call, invoked exactly once per record (INV-22/24: canonical hash is
   * set once and never recomputed). The caller (`ConfirmReviewUseCase`)
   * is responsible for the state-machine guard and hash computation
   * before calling this — this method only persists the already-computed
   * result.
   */
  confirmToReady(id: string, fields: ConfirmToReadyFields): Promise<void>;

  /**
   * Phase 5: DRAFT->DISCARDED persistence (dtr-lifecycle spec: "Discard
   * from DRAFT does not consume quota" — INV-50; there is no quota
   * implementation yet, so this is simply the state transition itself).
   */
  discard(id: string): Promise<void>;

  /**
   * Phase 6: the READY->ANCHORING transition's persistence — sets `state`
   * to ANCHORING and links `anchorId`, atomically with
   * `onSubmittedWithinTransaction` (design.md "Transactional enqueue"
   * decision, same pattern as `DigitalAssetRepositoryPort.createWithDraftRecord`):
   * `SubmitForAnchoringUseCase` passes a closure that enqueues the
   * `anchor-dtr` job inside this same DB transaction, so the job can never
   * be lost if the state-write fails (or vice versa). The caller is
   * responsible for creating the `Anchor` row first (via
   * `AnchorRepositoryPort.create`) and for the state-machine guard.
   */
  submitForAnchoring(
    id: string,
    anchorId: string,
    onSubmittedWithinTransaction?: (tx: TransactionHandle) => Promise<void>,
  ): Promise<void>;
}
