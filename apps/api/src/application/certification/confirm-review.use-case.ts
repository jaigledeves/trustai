import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { computeCanonicalHash, parseTrustRecord } from "@trustai/dtr-core";
import {
  ImmutableFieldError,
  InvalidTransitionError,
  TrustRecordState,
  TrustRecordStateMachine,
} from "../../domain/trust-record.entity";
import {
  DIGITAL_ASSET_REPOSITORY_PORT,
  type DigitalAssetRepositoryPort,
} from "../../ports/digital-asset-repository.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";

export interface ReviewEditParams {
  organizationId: string;
  trustRecordId: string;
  reviewedByUserId: string;
  summary?: string;
  classification?: string;
  language?: string;
}

export interface ConfirmParams {
  organizationId: string;
  trustRecordId: string;
}

export interface ConfirmResult {
  trustRecordId: string;
  canonicalHash: string;
  /** ISO 8601 UTC instant — matches dtr-core's TrustRecordV1.issuedAt. */
  issuedAt: string;
}

/**
 * Handles both halves of the dtr-lifecycle "review" flow described in
 * task 5.1: editing AI fields while still in DRAFT (`reviewEdit`, backing
 * `PATCH /trust-records/:id/review`), and the DRAFT->READY transition
 * that assembles + hashes the canonical DTR (`confirm`, backing
 * `POST /trust-records/:id/confirm`). Kept as one class/file per the
 * tasks.md deliverable, since both operate on the same aggregate and
 * share the same INV-21/INV-23 state-machine guard.
 *
 * Mirrors `RegisterUseCase`/`LoginUseCase`'s existing convention of
 * throwing NestJS HTTP exceptions directly from the use case, rather than
 * a separate domain-error-to-HTTP mapping layer.
 */
@Injectable()
export class ConfirmReviewUseCase {
  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(DIGITAL_ASSET_REPOSITORY_PORT)
    private readonly digitalAssetRepository: DigitalAssetRepositoryPort,
  ) {}

  async reviewEdit(params: ReviewEditParams): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findByIdForOrganization(
      params.organizationId,
      params.trustRecordId,
    );
    if (!trustRecord) {
      throw new NotFoundException("Trust record not found");
    }

    // INV-21: AI fields are editable only while state === DRAFT. Reuses
    // the state machine's own guard rather than reimplementing the check.
    try {
      TrustRecordStateMachine.assertMutableAiFields(trustRecord.state);
    } catch (err) {
      if (err instanceof ImmutableFieldError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    await this.trustRecordRepository.updateReviewFields(params.trustRecordId, {
      reviewedByUserId: params.reviewedByUserId,
      ...(params.summary !== undefined ? { aiSummary: params.summary } : {}),
      ...(params.classification !== undefined ? { aiClassification: params.classification } : {}),
      ...(params.language !== undefined ? { aiLanguage: params.language } : {}),
    });
  }

  async confirm(params: ConfirmParams): Promise<ConfirmResult> {
    const trustRecord = await this.trustRecordRepository.findByIdForOrganization(
      params.organizationId,
      params.trustRecordId,
    );
    if (!trustRecord) {
      throw new NotFoundException("Trust record not found");
    }

    // INV-24 defense-in-depth: an already-set canonicalHash is never
    // recomputed. In practice this can only happen if state is already
    // READY+ (the transition guard below would also catch it), but this
    // makes the invariant explicit and independently testable, matching
    // the dtr-lifecycle spec scenario verbatim ("Canonical hash never
    // recomputed").
    if (trustRecord.canonicalHash !== null) {
      throw new ConflictException(
        "This trust record has already been confirmed — canonicalHash cannot be recomputed (INV-24)",
      );
    }

    // Reuses the state machine's own transition validation (design.md:
    // every use case that changes state MUST go through it) instead of
    // reimplementing the DRAFT-only check.
    try {
      TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.READY);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    const asset = await this.digitalAssetRepository.findById(
      params.organizationId,
      trustRecord.assetId,
    );
    if (!asset) {
      // Should not happen in practice (the asset is created atomically
      // with the DRAFT record) — surfaced as a conflict rather than a
      // generic 500 since it indicates unexpected data state.
      throw new ConflictException("The asset backing this trust record could not be found");
    }

    const issuedAt = new Date().toISOString();

    // RF-030/031, INV-22/24: assemble the exact canonical JSON dtr-core
    // will hash — parseTrustRecord() both validates AND normalizes the
    // shape (drops nothing extra, matches .optional()/.strict() exactly),
    // so what gets hashed here is byte-for-byte what any independent
    // verifier reconstructing this DTR from its public fields would hash.
    const candidate: unknown = {
      schemaVersion: trustRecord.schemaVersion,
      asset: {
        sha256: asset.sha256,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        ...(asset.filename ? { filename: asset.filename } : {}),
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
      issuedAt,
    };

    // RF-025/INV-26: a record must not reach READY without complete,
    // schema-valid provenance+analysis — this is the checkpoint. If
    // analyze-document never ran (or failed), this rejects clearly
    // instead of hashing garbage.
    const parsed = parseTrustRecord(candidate);
    if (!parsed.ok) {
      throw new ConflictException(
        `Cannot confirm: analysis is incomplete or invalid (${parsed.issues.join("; ")})`,
      );
    }

    const canonicalHash = await computeCanonicalHash(parsed.record);

    await this.trustRecordRepository.confirmToReady(params.trustRecordId, {
      canonicalHash,
      issuedAt: parsed.record.issuedAt,
    });

    return { trustRecordId: params.trustRecordId, canonicalHash, issuedAt: parsed.record.issuedAt };
  }
}
