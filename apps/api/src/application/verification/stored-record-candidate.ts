import { buildTrustRecordCandidate } from "@trustai/dtr-core";
import type { TrustRecordWithAssetAndAnchor } from "../../ports/trust-record-repository.port";

/**
 * Rebuilds the UNVALIDATED Trust Record candidate from the stored columns,
 * with dtr-core's builder and the same field mapping `ConfirmReviewUseCase`
 * used at confirm time, for both dtr-1 and dtr-2. Shared by the public
 * verification and proof package use cases so both recompute the exact
 * hash that was certified (INV-22, ADR-015).
 */
export function buildStoredRecordCandidate(found: TrustRecordWithAssetAndAnchor): unknown {
  const trustRecord = found.trustRecord;
  return buildTrustRecordCandidate(trustRecord.schemaVersion, {
    // A missing issuedAt (impossible for READY+) fails parsing; it is never
    // defaulted to a value.
    issuedAt: found.issuedAt ?? "",
    asset: {
      sha256: found.asset.sha256,
      mimeType: found.asset.mimeType,
      sizeBytes: found.asset.sizeBytes,
      filename: found.asset.filename,
    },
    analysis: {
      summary: trustRecord.aiSummary,
      classification: trustRecord.aiClassification,
      language: trustRecord.aiLanguage,
    },
    provenance: {
      provider: trustRecord.aiProvider,
      model: trustRecord.aiModel,
      modelVersion: trustRecord.aiModelVersion,
      promptVersion: trustRecord.aiPromptVersion,
      taxonomyVersion: trustRecord.aiTaxonomyVersion,
      analyzedAt: trustRecord.aiAnalyzedAt?.toISOString(),
    },
  });
}
