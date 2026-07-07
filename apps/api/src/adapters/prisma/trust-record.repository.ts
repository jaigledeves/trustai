import { Injectable } from "@nestjs/common";
import type { TrustRecord as PrismaTrustRecord } from "@prisma/client";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type {
  AiAnalysisUpdateFields,
  ConfirmToReadyFields,
  ReviewFieldsUpdate,
  TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";
import { PrismaService } from "./prisma.service";

/**
 * Phase 3 (task 3.5) introduced the minimal surface: `findById` (unscoped
 * — see TrustRecordRepositoryPort) + `updateAiAnalysis`. Phase 5 (task
 * 5.3) EXTENDS this same file with org-scoped read/write methods for the
 * HTTP-facing trust-records controller.
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
}
