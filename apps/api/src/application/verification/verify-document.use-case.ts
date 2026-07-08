import { Inject, Injectable } from "@nestjs/common";
import { sha256Hex, verifyAssetAgainstRecord } from "@trustai/dtr-core";
import { AnchorStatus, type Anchor } from "../../domain/anchor.entity";
import { TrustRecordState, type TrustRecord } from "../../domain/trust-record.entity";
import { ANCHOR_PORT, type AnchorPort } from "../../ports/anchor.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
  type TrustRecordWithAssetAndAnchor,
} from "../../ports/trust-record-repository.port";
import {
  VERIFICATION_ATTEMPT_REPOSITORY_PORT,
  type VerificationAttemptChannel,
  type VerificationAttemptRepositoryPort,
  type VerificationAttemptType,
  type VerificationAttemptVerdict,
} from "../../ports/verification-attempt-repository.port";
import { EIDAS_DISCLAIMER } from "./eidas-disclaimer";

export type VerifyVerdict = VerificationAttemptVerdict;

export interface VerifyChainAnchor {
  anchored: boolean;
  /** Always sourced from the DB `Anchor` row — `AnchorPort.isAnchored` has no txHash getter (design.md). */
  txHash: string | null;
  blockTimestamp: Date | null;
  /** True when the on-chain read failed and this fell back to `Anchor.status` (spec: "On-Chain Read Failure Never Fails the Request"). */
  chainReadUnavailable: boolean;
}

export interface VerifyAnalysis {
  summary: string;
  classification: string;
  language: string;
}

export interface VerifyResult {
  /**
   * False when `trustRecordId` didn't resolve to any TrustRecord row at
   * all — lets the caller (the GET controller, Phase 4) return 404
   * instead of the 200 INVALID_RECORD used for POST's "unknown id" case
   * (design.md "GET vs POST 404 asymmetry").
   */
  resolved: boolean;
  verdict: VerifyVerdict;
  /** `null` only for INVALID_RECORD — no record to report chain state for. */
  chainAnchor: VerifyChainAnchor | null;
  /** Populated only for VALID/PENDING_ANCHOR via `verifyByUpload` — never for `verifyByHash` (INV-41), never for ASSET_MISMATCH/INVALID_RECORD. */
  analysis: VerifyAnalysis | null;
  explanation: string;
  disclaimer: string;
  verifiedAt: string;
}

export interface VerifyByHashParams {
  trustRecordId: string;
  channel: VerificationAttemptChannel;
}

export interface VerifyByUploadParams {
  trustRecordId: string;
  fileBytes: Uint8Array;
  channel: VerificationAttemptChannel;
}

type CertifiabilityBucket = "NOT_CERTIFIABLE" | "PENDING" | "CERTIFIED";

const EXPLANATIONS: Record<VerifyVerdict, string> = {
  VALID:
    "This document's content matches the certified Trust Record and its integrity hash is confirmed on-chain.",
  ASSET_MISMATCH:
    "The uploaded document does not correspond to this certified record — its content has changed, or it is a different file.",
  PENDING_ANCHOR:
    "This record has completed AI analysis and review but is still awaiting on-chain confirmation.",
  INVALID_RECORD: "No valid certified record exists for this identifier.",
};

/**
 * public-verification (UC-02): the core no-auth verification logic behind
 * both `GET /public/verify/:id` (`verifyByHash`, hash-only, INV-41 — never
 * includes `analysis`) and `POST /public/verify/:id` (`verifyByUpload`,
 * full — `analysis` populated only when the upload's hash matches).
 *
 * Reuses `verifyAssetAgainstRecord` from `@trustai/dtr-core` as-is for the
 * upload path, rebuilding the exact `TrustRecordV1` candidate JSON the
 * same way `ConfirmReviewUseCase.confirm` does — this is what makes the
 * verdict independently reproducible (spec: "Independent
 * Reproducibility").
 */
@Injectable()
export class VerifyDocumentUseCase {
  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(ANCHOR_PORT)
    private readonly anchorPort: AnchorPort,
    @Inject(VERIFICATION_ATTEMPT_REPOSITORY_PORT)
    private readonly verificationAttemptRepository: VerificationAttemptRepositoryPort,
  ) {}

  async verifyByHash(params: VerifyByHashParams): Promise<VerifyResult> {
    const found = await this.trustRecordRepository.findByIdWithAssetAndAnchor(
      params.trustRecordId,
    );
    if (!found) {
      return this.buildResult({ resolved: false, verdict: "INVALID_RECORD", chainAnchor: null, analysis: null });
    }

    const bucket = this.classify(found.trustRecord.state);

    if (bucket === "NOT_CERTIFIABLE") {
      return this.finish(found.trustRecord.id, "HASH_ONLY", params.channel, {
        resolved: true,
        verdict: "INVALID_RECORD",
        chainAnchor: null,
        analysis: null,
      });
    }

    if (bucket === "PENDING") {
      return this.finish(found.trustRecord.id, "HASH_ONLY", params.channel, {
        resolved: true,
        verdict: "PENDING_ANCHOR",
        chainAnchor: this.buildUnconfirmedChainAnchor(found.anchor),
        analysis: null,
      });
    }

    // CERTIFIED — INV-22/24 guarantees canonicalHash is set; defensive
    // fallback below only guards against otherwise-impossible data
    // corruption, never throws.
    if (!found.trustRecord.canonicalHash) {
      return this.finish(found.trustRecord.id, "HASH_ONLY", params.channel, {
        resolved: true,
        verdict: "INVALID_RECORD",
        chainAnchor: null,
        analysis: null,
      });
    }

    const chainAnchor = await this.resolveChainAnchor(found.trustRecord.canonicalHash, found.anchor);
    return this.finish(found.trustRecord.id, "HASH_ONLY", params.channel, {
      resolved: true,
      verdict: "VALID",
      chainAnchor,
      analysis: null,
    });
  }

  async verifyByUpload(params: VerifyByUploadParams): Promise<VerifyResult> {
    const found = await this.trustRecordRepository.findByIdWithAssetAndAnchor(
      params.trustRecordId,
    );
    if (!found) {
      return this.buildResult({ resolved: false, verdict: "INVALID_RECORD", chainAnchor: null, analysis: null });
    }

    const bucket = this.classify(found.trustRecord.state);

    if (bucket === "NOT_CERTIFIABLE") {
      return this.finish(found.trustRecord.id, "FULL", params.channel, {
        resolved: true,
        verdict: "INVALID_RECORD",
        chainAnchor: null,
        analysis: null,
      });
    }

    const uploadSha256 = await sha256Hex(params.fileBytes);
    const candidate = this.buildCandidate(found);
    const verification = await verifyAssetAgainstRecord(candidate, uploadSha256);

    if (verification.status === "invalid_record") {
      // Defensive: the DB-rebuilt candidate failed to parse as a valid DTR
      // (should not happen for a READY+ record — INV-22/24/26 guarantee a
      // complete, valid shape by the time it leaves DRAFT). Never throws.
      return this.finish(found.trustRecord.id, "FULL", params.channel, {
        resolved: true,
        verdict: "INVALID_RECORD",
        chainAnchor: null,
        analysis: null,
      });
    }

    if (verification.status === "asset_mismatch") {
      return this.finish(found.trustRecord.id, "FULL", params.channel, {
        resolved: true,
        verdict: "ASSET_MISMATCH",
        chainAnchor: null,
        analysis: null,
      });
    }

    // asset_verified
    const analysis = this.buildAnalysis(found.trustRecord);

    if (bucket === "PENDING") {
      return this.finish(found.trustRecord.id, "FULL", params.channel, {
        resolved: true,
        verdict: "PENDING_ANCHOR",
        chainAnchor: this.buildUnconfirmedChainAnchor(found.anchor),
        analysis,
      });
    }

    // CERTIFIED
    const chainAnchor = await this.resolveChainAnchor(verification.canonicalHash, found.anchor);
    return this.finish(found.trustRecord.id, "FULL", params.channel, {
      resolved: true,
      verdict: "VALID",
      chainAnchor,
      analysis,
    });
  }

  private classify(state: TrustRecordState): CertifiabilityBucket {
    switch (state) {
      case TrustRecordState.CERTIFIED:
        return "CERTIFIED";
      case TrustRecordState.READY:
      case TrustRecordState.ANCHORING:
        return "PENDING";
      default:
        // DRAFT, FAILED, DISCARDED
        return "NOT_CERTIFIABLE";
    }
  }

  private buildCandidate(found: TrustRecordWithAssetAndAnchor): unknown {
    const trustRecord = found.trustRecord;
    return {
      schemaVersion: trustRecord.schemaVersion,
      asset: {
        sha256: found.asset.sha256,
        mimeType: found.asset.mimeType,
        sizeBytes: found.asset.sizeBytes,
        ...(found.asset.filename ? { filename: found.asset.filename } : {}),
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
      issuedAt: found.issuedAt,
    };
  }

  private buildAnalysis(trustRecord: TrustRecord): VerifyAnalysis {
    return {
      summary: trustRecord.aiSummary ?? "",
      classification: trustRecord.aiClassification ?? "",
      language: trustRecord.aiLanguage ?? "",
    };
  }

  /**
   * READY/ANCHORING: not certified yet, so there is nothing to corroborate
   * on-chain — no `AnchorPort.isAnchored` call is made (spec: "Not yet
   * anchored -> PENDING_ANCHOR ... no chain data confirmed").
   */
  private buildUnconfirmedChainAnchor(anchor: Anchor | null): VerifyChainAnchor {
    return {
      anchored: false,
      txHash: anchor?.txHash ?? null,
      blockTimestamp: null,
      chainReadUnavailable: false,
    };
  }

  /**
   * CERTIFIED only: corroborates via `AnchorPort.isAnchored`. On RPC
   * failure, falls back to the DB `Anchor.status` and flags
   * `chainReadUnavailable: true` — never throws (spec: "On-Chain Read
   * Failure Never Fails the Request").
   */
  private async resolveChainAnchor(
    canonicalHash: string,
    anchor: Anchor | null,
  ): Promise<VerifyChainAnchor> {
    try {
      const status = await this.anchorPort.isAnchored(canonicalHash);
      return {
        anchored: status.anchored,
        txHash: anchor?.txHash ?? null,
        blockTimestamp: status.blockTimestamp,
        chainReadUnavailable: false,
      };
    } catch {
      return {
        anchored: anchor?.status === AnchorStatus.CONFIRMED,
        txHash: anchor?.txHash ?? null,
        blockTimestamp: anchor?.blockTimestamp ?? null,
        chainReadUnavailable: true,
      };
    }
  }

  private async finish(
    trustRecordId: string,
    type: VerificationAttemptType,
    channel: VerificationAttemptChannel,
    fields: { resolved: true; verdict: VerifyVerdict; chainAnchor: VerifyChainAnchor | null; analysis: VerifyAnalysis | null },
  ): Promise<VerifyResult> {
    // design.md "Attempt logging for unknown ids": only resolved ids ever
    // reach here — the unresolved (`resolved: false`) path returns before
    // calling this method, so `record()` is never invoked for an unknown
    // id (required FK, no migration to make it nullable).
    await this.verificationAttemptRepository.record({ trustRecordId, type, verdict: fields.verdict, channel });
    return this.buildResult(fields);
  }

  private buildResult(fields: {
    resolved: boolean;
    verdict: VerifyVerdict;
    chainAnchor: VerifyChainAnchor | null;
    analysis: VerifyAnalysis | null;
  }): VerifyResult {
    return {
      resolved: fields.resolved,
      verdict: fields.verdict,
      chainAnchor: fields.chainAnchor,
      analysis: fields.analysis,
      explanation: EXPLANATIONS[fields.verdict],
      disclaimer: EIDAS_DISCLAIMER,
      verifiedAt: new Date().toISOString(),
    };
  }
}
