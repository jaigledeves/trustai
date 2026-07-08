export enum AssetStatus {
  PENDING = "PENDING",
  READY = "READY",
  DELETED = "DELETED",
}

/**
 * Zero framework imports (hexagonal domain layer). `sha256` is computed
 * exactly once at ingestion and never recomputed afterward (INV-10) —
 * enforced by `UploadAssetUseCase`, not by this class.
 */
export class DigitalAsset {
  constructor(
    public readonly id: string,
    public readonly sha256: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly filename: string | null,
    public readonly storageRef: string,
    public readonly status: AssetStatus,
    public readonly organizationId: string,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {}
}
