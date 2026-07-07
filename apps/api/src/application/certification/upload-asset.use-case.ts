import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  DIGITAL_ASSET_REPOSITORY_PORT,
  type DigitalAssetRepositoryPort,
} from "../../ports/digital-asset-repository.port";
import { ENCRYPTION_PORT, type EncryptionPort } from "../../ports/encryption.port";
import { STORAGE_PORT, type StoragePort } from "../../ports/storage.port";

export interface UploadAssetParams {
  organizationId: string;
  createdByUserId: string;
  buffer: Buffer;
  mimeType: string;
  filename: string | null;
}

export interface UploadAssetResult {
  assetId: string;
  trustRecordId: string;
  duplicate: boolean;
}

@Injectable()
export class UploadAssetUseCase {
  constructor(
    @Inject(DIGITAL_ASSET_REPOSITORY_PORT)
    private readonly repository: DigitalAssetRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    @Inject(ENCRYPTION_PORT)
    private readonly encryption: EncryptionPort,
  ) {}

  async execute(params: UploadAssetParams): Promise<UploadAssetResult> {
    // INV-10: computed once, here, from the raw bytes — never recomputed
    // afterward by any other code path.
    const sha256 = createHash("sha256").update(params.buffer).digest("hex");

    // RF-012/INV-11: dedup lookup is scoped to organizationId — the same
    // hash in a different org is never a duplicate (handled naturally by
    // the repository's org-scoped query, not by special-casing here).
    const existing = await this.repository.findBySha256(params.organizationId, sha256);
    if (existing) {
      return {
        assetId: existing.asset.id,
        trustRecordId: existing.trustRecordId,
        duplicate: true,
      };
    }

    // INV-12: encrypt before the storage adapter ever sees the bytes —
    // storageRef points only at the ciphertext blob.
    const ciphertext = await this.encryption.encrypt(params.buffer);
    const storageKey = `${params.organizationId}/${sha256}`;
    await this.storage.putObject({
      key: storageKey,
      body: ciphertext,
      contentType: "application/octet-stream",
    });

    const { asset, trustRecordId } = await this.repository.createWithDraftRecord({
      sha256,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.byteLength,
      filename: params.filename,
      storageRef: storageKey,
      organizationId: params.organizationId,
      createdByUserId: params.createdByUserId,
    });

    return { assetId: asset.id, trustRecordId, duplicate: false };
  }
}
