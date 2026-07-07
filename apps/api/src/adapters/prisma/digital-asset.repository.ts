import { Injectable } from "@nestjs/common";
import type { DigitalAsset as PrismaDigitalAsset } from "@prisma/client";
import { DTR_SCHEMA_VERSION } from "@trustai/dtr-core";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import type {
  AssetWithDraftRecord,
  DigitalAssetRepositoryPort,
} from "../../ports/digital-asset-repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaDigitalAssetRepository implements DigitalAssetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(organizationId: string, id: string): Promise<DigitalAsset | null> {
    // RNF-004: org scoping at the query level, not just response filtering —
    // a mismatched organizationId behaves identically to a missing row.
    const record = await this.prisma.digitalAsset.findFirst({
      where: { id, organizationId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findBySha256(
    organizationId: string,
    sha256: string,
  ): Promise<AssetWithDraftRecord | null> {
    const record = await this.prisma.digitalAsset.findFirst({
      where: { organizationId, sha256 },
      include: { trustRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!record || record.trustRecords.length === 0) {
      return null;
    }

    return {
      asset: this.toDomain(record),
      trustRecordId: record.trustRecords[0]!.id,
    };
  }

  async createWithDraftRecord(params: {
    sha256: string;
    mimeType: string;
    sizeBytes: number;
    filename: string | null;
    storageRef: string;
    organizationId: string;
    createdByUserId: string;
  }): Promise<AssetWithDraftRecord> {
    const [assetRecord, trustRecord] = await this.prisma.$transaction(async (tx) => {
      // Bytes are already hashed, encrypted, and durably stored by the time
      // this runs (UploadAssetUseCase), so the asset is created directly as
      // READY — there is no further async processing step in this slice.
      const asset = await tx.digitalAsset.create({
        data: {
          sha256: params.sha256,
          mimeType: params.mimeType,
          sizeBytes: params.sizeBytes,
          filename: params.filename,
          storageRef: params.storageRef,
          status: "READY",
          organizationId: params.organizationId,
          createdByUserId: params.createdByUserId,
        },
      });

      const draftTrustRecord = await tx.trustRecord.create({
        data: {
          schemaVersion: DTR_SCHEMA_VERSION,
          assetId: asset.id,
          assetHash: params.sha256,
          state: "DRAFT",
        },
      });

      return [asset, draftTrustRecord] as const;
    });

    return {
      asset: this.toDomain(assetRecord),
      trustRecordId: trustRecord.id,
    };
  }

  private toDomain(record: PrismaDigitalAsset): DigitalAsset {
    return new DigitalAsset(
      record.id,
      record.sha256,
      record.mimeType,
      record.sizeBytes,
      record.filename,
      record.storageRef,
      this.toDomainStatus(record.status),
      record.organizationId,
      record.createdByUserId,
      record.createdAt,
    );
  }

  private toDomainStatus(status: PrismaDigitalAsset["status"]): AssetStatus {
    switch (status) {
      case "PENDING":
        return AssetStatus.PENDING;
      case "READY":
        return AssetStatus.READY;
      case "DELETED":
        return AssetStatus.DELETED;
    }
  }
}
