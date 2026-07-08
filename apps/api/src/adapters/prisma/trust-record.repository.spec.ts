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
