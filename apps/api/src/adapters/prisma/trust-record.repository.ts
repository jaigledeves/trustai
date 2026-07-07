import { Injectable } from "@nestjs/common";
import type { TrustRecord as PrismaTrustRecord } from "@prisma/client";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type {
  AiAnalysisUpdateFields,
  TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";
import { PrismaService } from "./prisma.service";

/**
 * Phase 3 (task 3.5) minimal surface: `findById` (unscoped — see
 * TrustRecordRepositoryPort) + `updateAiAnalysis`. Phase 5 (task 5.3)
 * EXTENDS this same file with org-scoped read methods for the
 * HTTP-facing trust-records controller — do not create a second file.
 */
@Injectable()
export class PrismaTrustRecordRepository implements TrustRecordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TrustRecord | null> {
    const record = await this.prisma.trustRecord.findUnique({ where: { id } });
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
