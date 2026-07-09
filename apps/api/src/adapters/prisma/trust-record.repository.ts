import { Injectable } from "@nestjs/common";
import type {
  Anchor as PrismaAnchor,
  DigitalAsset as PrismaDigitalAsset,
  TrustRecord as PrismaTrustRecord,
} from "@prisma/client";
import { Anchor, AnchorStatus } from "../../domain/anchor.entity";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type {
  AiAnalysisUpdateFields,
  ConfirmToReadyFields,
  ReviewFieldsUpdate,
  TrustRecordListResult,
  TrustRecordRepositoryPort,
  TrustRecordWithAssetAndAnchor,
} from "../../ports/trust-record-repository.port";
import type { TransactionHandle } from "../../ports/queue.port";
import { PrismaService } from "./prisma.service";

/**
 * Phase 3 (task 3.5) introduced the minimal surface: `findById` (unscoped
 * — see TrustRecordRepositoryPort) + `updateAiAnalysis`. Phase 5 (task
 * 5.3) EXTENDED this with org-scoped read/write methods for the
 * HTTP-facing trust-records controller. Phase 6 (task 6.3) adds
 * `submitForAnchoring`.
 */
@Injectable()
export class PrismaTrustRecordRepository implements TrustRecordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TrustRecord | null> {
    const record = await this.prisma.trustRecord.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdForOrganization(organizationId: string, id: string): Promise<TrustRecord | null> {
    // RNF-004: org scoping at the query level via the DigitalAsset relation
    // — TrustRecord has no organizationId column of its own.
    const record = await this.prisma.trustRecord.findFirst({
      where: { id, asset: { organizationId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllForOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<TrustRecordListResult> {
    // RNF-004: same org-scoping join pattern as findByIdForOrganization —
    // filtered at the query level via the DigitalAsset relation, never by
    // post-filtering an unscoped result.
    const where = { asset: { organizationId } };

    // Defensive lower-bound clamp: even though the controller already
    // normalizes these, this port is the last line before Prisma — a
    // negative `skip`/zero `take` here is a 500/empty-page bug, so guard
    // it at the query itself regardless of caller.
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);

    const [records, total] = await Promise.all([
      this.prisma.trustRecord.findMany({
        where,
        select: {
          id: true,
          state: true,
          createdAt: true,
          asset: { select: { filename: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.trustRecord.count({ where }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        state: this.toDomainState(record.state),
        filename: record.asset.filename,
        createdAt: record.createdAt,
      })),
      total,
    };
  }

  async findByIdWithAssetAndAnchor(id: string): Promise<TrustRecordWithAssetAndAnchor | null> {
    // public-verification (UC-02): deliberately unscoped — see the port
    // doc comment. One query, joined via Prisma's `include`, never a
    // separate round-trip per related row.
    const record = await this.prisma.trustRecord.findUnique({
      where: { id },
      include: { asset: true, anchor: true },
    });
    if (!record) {
      return null;
    }

    return {
      trustRecord: this.toDomain(record),
      issuedAt: record.issuedAt ? record.issuedAt.toISOString() : null,
      asset: this.assetToDomain(record.asset),
      anchor: record.anchor ? this.anchorToDomain(record.anchor) : null,
    };
  }

  async updateAiAnalysis(id: string, fields: AiAnalysisUpdateFields): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: {
        aiSummary: fields.aiSummary,
        aiClassification: fields.aiClassification,
        aiLanguage: fields.aiLanguage,
        aiProvider: fields.aiProvider,
        aiModel: fields.aiModel,
        aiModelVersion: fields.aiModelVersion,
        aiPromptVersion: fields.aiPromptVersion,
        aiTaxonomyVersion: fields.aiTaxonomyVersion,
        aiAnalyzedAt: fields.aiAnalyzedAt,
      },
    });
  }

  async updateReviewFields(id: string, fields: ReviewFieldsUpdate): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: {
        reviewedByUserId: fields.reviewedByUserId,
        // Undefined fields are left untouched by Prisma (distinct from
        // null, which would clear the column) — only explicitly-edited
        // fields are included by the caller in the first place.
        ...(fields.aiSummary !== undefined ? { aiSummary: fields.aiSummary } : {}),
        ...(fields.aiClassification !== undefined
          ? { aiClassification: fields.aiClassification }
          : {}),
        ...(fields.aiLanguage !== undefined ? { aiLanguage: fields.aiLanguage } : {}),
      },
    });
  }

  async confirmToReady(id: string, fields: ConfirmToReadyFields): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: {
        state: "READY",
        canonicalHash: fields.canonicalHash,
        issuedAt: new Date(fields.issuedAt),
      },
    });
  }

  async discard(id: string): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: { state: "DISCARDED" },
    });
  }

  async submitForAnchoring(
    id: string,
    anchorId: string,
    onSubmittedWithinTransaction?: (tx: TransactionHandle) => Promise<void>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.trustRecord.update({
        where: { id },
        data: { state: "ANCHORING", anchorId },
      });

      // Runs inside this same transaction — if it throws, the state write
      // above rolls back too (design.md "Transactional enqueue" decision,
      // same pattern as PrismaDigitalAssetRepository.createWithDraftRecord).
      if (onSubmittedWithinTransaction) {
        await onSubmittedWithinTransaction(tx);
      }
    });
  }

  async certify(id: string): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: { state: "CERTIFIED" },
    });
  }

  async markAnchoringFailed(id: string): Promise<void> {
    await this.prisma.trustRecord.update({
      where: { id },
      data: { state: "FAILED" },
    });
  }

  async retryAnchoring(
    id: string,
    onRetryWithinTransaction?: (tx: TransactionHandle) => Promise<void>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.trustRecord.update({
        where: { id },
        data: { state: "ANCHORING" },
      });

      if (onRetryWithinTransaction) {
        await onRetryWithinTransaction(tx);
      }
    });
  }

  private toDomain(record: PrismaTrustRecord): TrustRecord {
    return new TrustRecord(
      record.id,
      record.schemaVersion,
      record.assetId,
      record.assetHash,
      record.canonicalHash,
      this.toDomainState(record.state),
      record.versionNumber,
      record.aiSummary,
      record.aiClassification,
      record.aiLanguage,
      record.aiProvider,
      record.aiModel,
      record.aiModelVersion,
      record.aiPromptVersion,
      record.aiTaxonomyVersion,
      record.aiAnalyzedAt,
      record.reviewedByUserId,
      record.anchorId,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toDomainState(state: PrismaTrustRecord["state"]): TrustRecordState {
    switch (state) {
      case "DRAFT":
        return TrustRecordState.DRAFT;
      case "READY":
        return TrustRecordState.READY;
      case "ANCHORING":
        return TrustRecordState.ANCHORING;
      case "CERTIFIED":
        return TrustRecordState.CERTIFIED;
      case "FAILED":
        return TrustRecordState.FAILED;
      case "DISCARDED":
        return TrustRecordState.DISCARDED;
    }
  }

  private assetToDomain(record: PrismaDigitalAsset): DigitalAsset {
    return new DigitalAsset(
      record.id,
      record.sha256,
      record.mimeType,
      record.sizeBytes,
      record.filename,
      record.storageRef,
      this.assetToDomainStatus(record.status),
      record.organizationId,
      record.createdByUserId,
      record.createdAt,
    );
  }

  private assetToDomainStatus(status: PrismaDigitalAsset["status"]): AssetStatus {
    switch (status) {
      case "PENDING":
        return AssetStatus.PENDING;
      case "READY":
        return AssetStatus.READY;
      case "DELETED":
        return AssetStatus.DELETED;
    }
  }

  private anchorToDomain(record: PrismaAnchor): Anchor {
    return new Anchor(
      record.id,
      record.chain,
      record.network,
      record.txHash,
      record.merkleRoot,
      record.blockTimestamp,
      this.anchorToDomainStatus(record.status),
      record.createdAt,
      record.updatedAt,
    );
  }

  private anchorToDomainStatus(status: PrismaAnchor["status"]): AnchorStatus {
    switch (status) {
      case "PENDING":
        return AnchorStatus.PENDING;
      case "CONFIRMED":
        return AnchorStatus.CONFIRMED;
      case "FAILED":
        return AnchorStatus.FAILED;
    }
  }
}
