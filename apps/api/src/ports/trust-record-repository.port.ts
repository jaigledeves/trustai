import type { Anchor } from "../domain/anchor.entity";
import type { DigitalAsset } from "../domain/digital-asset.entity";
import type { TrustRecord, TrustRecordState } from "../domain/trust-record.entity";
import type { TransactionHandle } from "./queue.port";

export const TRUST_RECORD_REPOSITORY_PORT = Symbol("TrustRecordRepositoryPort");

/**
 * public-verification design.md "Repository lookup" decision: everything
 * `VerifyDocumentUseCase` needs from one unscoped query — `trustRecord`
 * (the domain entity, unchanged), `issuedAt` (persisted at the DRAFT->READY
 * transition — `TrustRecord` itself deliberately doesn't carry it, see
 * `ConfirmToReadyFields`), `asset` and `anchor` (existing domain entities,
 * reused as-is rather than duplicating their fields here).
 */
export interface TrustRecordWithAssetAndAnchor {
  trustRecord: TrustRecord;
  /** ISO 8601 UTC instant, `null` while still DRAFT (never confirmed). */
  issuedAt: string | null;
  asset: DigitalAsset;
  anchor: Anchor | null;
}

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

/**
 * web-history (Phase 2 companion slice): list-view fields only — no anchor
 * joins. `aiClassification` is the one AI field included: it lives on the
 * TrustRecord row itself (no extra join) and lets the list act as an
 * organizing/browsing surface instead of a bare id table.
 */
export interface TrustRecordListItem {
  id: string;
  state: TrustRecordState;
  filename: string | null;
  aiClassification: string | null;
  createdAt: Date;
}

export interface TrustRecordListResult {
  items: TrustRecordListItem[];
  total: number;
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
   * ADR-007 / web-certify-flow "Persistent Document Context": org-scoped
   * detail lookup that ALSO joins `DigitalAsset` in the same query, for the
   * HTTP-facing controller's `getById` — which needs `asset.filename` /
   * `sizeBytes` / `createdAt` alongside the record. Deliberately a
   * dedicated method rather than widening `findByIdForOrganization`
   * (design.md "How to expose asset fields on the org-scoped detail path"):
   * `ConfirmReviewUseCase`, `DiscardDraftUseCase`, and
   * `SubmitForAnchoringUseCase` all depend on that method's plain
   * `TrustRecord` return type and must not be forced through a fatter
   * shape (ISP). Same org-scoping join pattern as `findByIdForOrganization`
   * (RNF-004: filtered at the query level via `DigitalAsset.organizationId`,
   * never post-filtered) — a cross-org id returns `null`, identical to a
   * missing one.
   */
  findByIdForOrganizationWithAsset(
    organizationId: string,
    id: string,
  ): Promise<{ trustRecord: TrustRecord; asset: DigitalAsset } | null>;

  /**
   * web-history (Phase 2 companion slice): org-scoped, paginated list for
   * the frontend's `/dtrs` view. Same org-scoping join pattern as
   * `findByIdForOrganization` (RNF-004: filtered at the query level via
   * `DigitalAsset.organizationId`, never by post-filtering an unscoped
   * result). List-view fields only — no AI/anchor joins (those are the
   * detail view's job via `findByIdForOrganization` + the anchor repo).
   */
  findAllForOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<TrustRecordListResult>;

  /**
   * public-verification (UC-02): unscoped by design — the public
   * verification endpoints have no `organizationId` to scope by (design.md
   * "Repository lookup" decision, rejecting composing
   * `AnchorRepositoryPort.findById` + `DigitalAssetRepositoryPort.findById`
   * specifically because the latter requires one). One Prisma query
   * (`include: {asset, anchor}`) — never leaks more than existence + the
   * fields `VerifyDocumentUseCase` already re-derives a verdict from.
   */
  findByIdWithAssetAndAnchor(id: string): Promise<TrustRecordWithAssetAndAnchor | null>;

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

  /**
   * Phase 7: the ANCHORING->CERTIFIED transition's persistence (INV-32).
   * Called either immediately (AnchorDtrHandler's `AlreadyAnchored` path —
   * nothing to poll for, the hash is already a known-confirmed fact) or
   * after `ConfirmAnchorHandler` observes >=2 confirmations. The caller is
   * responsible for the state-machine guard before calling this.
   */
  certify(id: string): Promise<void>;

  /**
   * Phase 7: the ANCHORING->FAILED transition's persistence
   * (blockchain-anchoring spec: "Automatic Retry With Visible State on
   * Failure" — the failure must be visible, not a silent stall).
   */
  markAnchoringFailed(id: string): Promise<void>;

  /**
   * Phase 7: the FAILED->ANCHORING transition's persistence — the retry
   * half of RF-033. Atomically re-enqueues a fresh `anchor-dtr` job via
   * `onRetryWithinTransaction` (same transactional-callback pattern as
   * `submitForAnchoring`), so the job can never be lost if the state
   * write fails.
   */
  retryAnchoring(
    id: string,
    onRetryWithinTransaction?: (tx: TransactionHandle) => Promise<void>,
  ): Promise<void>;
}
