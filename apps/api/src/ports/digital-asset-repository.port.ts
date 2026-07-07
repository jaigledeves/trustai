import type { DigitalAsset } from "../domain/digital-asset.entity";

export const DIGITAL_ASSET_REPOSITORY_PORT = Symbol("DigitalAssetRepositoryPort");

export interface AssetWithDraftRecord {
  asset: DigitalAsset;
  trustRecordId: string;
}

export interface DigitalAssetRepositoryPort {
  /**
   * RNF-004 org scoping at the query level. Returns `null` if no asset
   * exists in this org for this id — the caller (controller) turns that
   * into a 404, never a 403, to avoid existence leakage across orgs
   * (asset-ingestion spec: "Cross-org access is rejected").
   */
  findById(organizationId: string, id: string): Promise<DigitalAsset | null>;

  /**
   * RF-012/INV-11 duplicate detection, scoped to `organizationId` — the
   * same `sha256` in a different org is never considered a duplicate
   * (asset-ingestion spec: "Same hash across different orgs is not a
   * duplicate"). Returns the most recent associated `TrustRecord` id so
   * the caller can point the user at the existing DTR instead of
   * creating a new one.
   */
  findBySha256(
    organizationId: string,
    sha256: string,
  ): Promise<AssetWithDraftRecord | null>;

  /**
   * Atomically creates the `DigitalAsset` row and its initial DRAFT
   * `TrustRecord` row (asset-ingestion spec: "Successful upload creates
   * asset and draft record") — mirrors `UserRepositoryPort.createOrgWithAdmin`'s
   * pattern of a repository method spanning two tables that are always
   * created together.
   */
  createWithDraftRecord(params: {
    sha256: string;
    mimeType: string;
    sizeBytes: number;
    filename: string | null;
    storageRef: string;
    organizationId: string;
    createdByUserId: string;
  }): Promise<AssetWithDraftRecord>;
}
