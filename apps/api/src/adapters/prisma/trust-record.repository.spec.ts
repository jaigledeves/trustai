import { describe, expect, it, vi } from "vitest";
import { PrismaTrustRecordRepository } from "./trust-record.repository";
import type { PrismaService } from "./prisma.service";

function buildFakePrisma(overrides: {
  findMany?: ReturnType<typeof vi.fn>;
  count?: ReturnType<typeof vi.fn>;
} = {}): PrismaService {
  return {
    trustRecord: {
      findMany: overrides.findMany ?? vi.fn().mockResolvedValue([]),
      count: overrides.count ?? vi.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;
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

  it("orders by createdAt desc and selects only list-view fields (no anchor joins)", async () => {
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
          aiClassification: true,
          createdAt: true,
          asset: { select: { filename: true } },
        },
      }),
    );
  });

  it("maps the joined asset.filename and aiClassification onto each list item and returns the total count", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "tr-1",
        state: "DRAFT",
        aiClassification: "Contrato",
        createdAt,
        asset: { filename: "doc.pdf" },
      },
      {
        id: "tr-2",
        state: "READY",
        aiClassification: null,
        createdAt,
        asset: { filename: null },
      },
    ]);
    const count = vi.fn().mockResolvedValue(2);
    const prisma = buildFakePrisma({ findMany, count });
    const repository = new PrismaTrustRecordRepository(prisma);

    const result = await repository.findAllForOrganization("org-1", 1, 20);

    expect(result).toEqual({
      items: [
        {
          id: "tr-1",
          state: "DRAFT",
          filename: "doc.pdf",
          aiClassification: "Contrato",
          createdAt,
        },
        {
          id: "tr-2",
          state: "READY",
          filename: null,
          aiClassification: null,
          createdAt,
        },
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
