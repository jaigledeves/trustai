import { describe, expect, it, vi } from "vitest";
import { PrismaTrustRecordRepository } from "./trust-record.repository";
import type { PrismaService } from "./prisma.service";

function buildFakePrisma(overrides: {
  findMany?: ReturnType<typeof vi.fn>;
  count?: ReturnType<typeof vi.fn>;
  findFirst?: ReturnType<typeof vi.fn>;
} = {}): PrismaService {
  return {
    trustRecord: {
      findMany: overrides.findMany ?? vi.fn().mockResolvedValue([]),
      count: overrides.count ?? vi.fn().mockResolvedValue(0),
      findFirst: overrides.findFirst ?? vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;
}

/** Full Prisma-shaped TrustRecord row — matches every field `toDomain` reads. */
function buildFakePrismaTrustRecordRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tr-1",
    schemaVersion: "1.0.0",
    assetId: "asset-1",
    assetHash: "hash-1",
    canonicalHash: null,
    state: "DRAFT",
    versionNumber: 1,
    aiSummary: null,
    aiClassification: null,
    aiLanguage: null,
    aiProvider: null,
    aiModel: null,
    aiModelVersion: null,
    aiPromptVersion: null,
    aiTaxonomyVersion: null,
    aiAnalyzedAt: null,
    reviewedByUserId: null,
    anchorId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** Full Prisma-shaped DigitalAsset row — matches every field `assetToDomain` reads. */
function buildFakePrismaAssetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    sha256: "sha-1",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    filename: "doc.pdf",
    storageRef: "s3://bucket/asset-1",
    status: "READY",
    organizationId: "org-1",
    createdByUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("PrismaTrustRecordRepository.findAllForOrganization (RNF-004: org-scoped pagination)", () => {
  it("scopes the query by DigitalAsset.organizationId at the query level, never post-filtering", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = buildFakePrisma({ findMany, count });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 1, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asset: { organizationId: "org-1" } },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { asset: { organizationId: "org-1" } },
    });
  });

  it("computes skip/take from page/pageSize (page 2, pageSize 10 -> skip 10, take 10)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 2, 10);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it("clamps page<=0 up to 1 so `skip` is never negative (page=0 -> skip 0)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 0, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("clamps a negative page up to 1 (page=-1 -> skip 0, never a negative Prisma skip)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", -1, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("clamps pageSize=0 up to 1 so `take` is never zero (page=2, pageSize=0 -> skip 1, take 1)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 2, 0);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1, take: 1 }),
    );
  });

  it("clamps a negative pageSize up to 1 (pageSize=-5 -> take 1, never a negative Prisma take)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 1, -5);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 1 }),
    );
  });

  it("orders by createdAt desc and selects only list-view fields (no AI/anchor joins)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = buildFakePrisma({ findMany });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findAllForOrganization("org-1", 1, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          state: true,
          createdAt: true,
          asset: { select: { filename: true } },
        },
      }),
    );
  });

  it("maps the joined asset.filename onto each list item and returns the total count", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      { id: "tr-1", state: "DRAFT", createdAt, asset: { filename: "doc.pdf" } },
      { id: "tr-2", state: "READY", createdAt, asset: { filename: null } },
    ]);
    const count = vi.fn().mockResolvedValue(2);
    const prisma = buildFakePrisma({ findMany, count });
    const repository = new PrismaTrustRecordRepository(prisma);

    const result = await repository.findAllForOrganization("org-1", 1, 20);

    expect(result).toEqual({
      items: [
        { id: "tr-1", state: "DRAFT", filename: "doc.pdf", createdAt },
        { id: "tr-2", state: "READY", filename: null, createdAt },
      ],
      total: 2,
    });
  });

  it("returns an empty list (not an error) when the organization has zero trust records", async () => {
    const prisma = buildFakePrisma();
    const repository = new PrismaTrustRecordRepository(prisma);

    const result = await repository.findAllForOrganization("org-empty", 1, 20);

    expect(result).toEqual({ items: [], total: 0 });
  });
});

describe("PrismaTrustRecordRepository.findByIdForOrganizationWithAsset (ADR-007: org-scoped asset join)", () => {
  it("scopes the query by DigitalAsset.organizationId at the query level and includes the asset", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = buildFakePrisma({ findFirst });
    const repository = new PrismaTrustRecordRepository(prisma);

    await repository.findByIdForOrganizationWithAsset("org-1", "tr-1");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "tr-1", asset: { organizationId: "org-1" } },
      include: { asset: true },
    });
  });

  it("returns null (not a post-filtered leak) when findFirst finds no row for this org+id", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = buildFakePrisma({ findFirst });
    const repository = new PrismaTrustRecordRepository(prisma);

    const result = await repository.findByIdForOrganizationWithAsset("org-cross", "tr-1");

    expect(result).toBeNull();
  });

  it("maps the joined record and asset into { trustRecord, asset } when found", async () => {
    const trustRecordRow = buildFakePrismaTrustRecordRow({ id: "tr-1", assetId: "asset-1" });
    const assetRow = buildFakePrismaAssetRow({ id: "asset-1", filename: "report.pdf", sizeBytes: 2048 });
    const findFirst = vi.fn().mockResolvedValue({ ...trustRecordRow, asset: assetRow });
    const prisma = buildFakePrisma({ findFirst });
    const repository = new PrismaTrustRecordRepository(prisma);

    const result = await repository.findByIdForOrganizationWithAsset("org-1", "tr-1");

    expect(result).not.toBeNull();
    expect(result?.trustRecord.id).toBe("tr-1");
    expect(result?.trustRecord.assetId).toBe("asset-1");
    expect(result?.asset.id).toBe("asset-1");
    expect(result?.asset.filename).toBe("report.pdf");
    expect(result?.asset.sizeBytes).toBe(2048);
  });
});
