import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type { AnchorRepositoryPort } from "../../ports/anchor-repository.port";
import type { QueuePort } from "../../ports/queue.port";
import type { TrustRecordRepositoryPort } from "../../ports/trust-record-repository.port";
import type { ListTrustRecordsQueryDto } from "./dto/list-trust-records-query.dto";
import { TrustRecordsController } from "./trust-records.controller";

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base: TrustRecord = new TrustRecord(
    "tr-1",
    "1.0.0",
    "asset-1",
    "hash-1",
    null,
    TrustRecordState.DRAFT,
    1,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-01-01T00:00:00.000Z"),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildDigitalAsset(overrides: Partial<DigitalAsset> = {}): DigitalAsset {
  const base = new DigitalAsset(
    "asset-1",
    "sha-1",
    "application/pdf",
    2048,
    "report.pdf",
    "s3://bucket/asset-1",
    AssetStatus.READY,
    "org-1",
    "user-1",
    new Date("2026-02-01T00:00:00.000Z"),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildController(overrides: {
  findByIdForOrganizationWithAsset?: ReturnType<typeof vi.fn>;
  findAllForOrganization?: ReturnType<typeof vi.fn>;
  anchorFindById?: ReturnType<typeof vi.fn>;
  findLatestJobByTrustRecordId?: ReturnType<typeof vi.fn>;
} = {}): TrustRecordsController {
  const trustRecordRepository = {
    findByIdForOrganizationWithAsset:
      overrides.findByIdForOrganizationWithAsset ?? vi.fn().mockResolvedValue(null),
    findAllForOrganization:
      overrides.findAllForOrganization ?? vi.fn().mockResolvedValue({ items: [], total: 0 }),
  } as unknown as TrustRecordRepositoryPort;

  const anchorRepository = {
    findById: overrides.anchorFindById ?? vi.fn().mockResolvedValue(null),
  } as unknown as AnchorRepositoryPort;

  const queue = {
    findLatestJobByTrustRecordId:
      overrides.findLatestJobByTrustRecordId ?? vi.fn().mockResolvedValue(null),
  } as unknown as QueuePort;

  // getById never touches these three — undefined is fine for this test's scope.
  return new TrustRecordsController(
    undefined as never,
    undefined as never,
    undefined as never,
    trustRecordRepository,
    anchorRepository,
    queue,
  );
}

describe("TrustRecordsController.getById (web-certify-flow: Persistent Document Context)", () => {
  it("maps the repository's asset into the DTO's asset field, with uploadedAt from asset.createdAt", async () => {
    const trustRecord = buildTrustRecord({ aiSummary: "summary" });
    const asset = buildDigitalAsset({
      filename: "report.pdf",
      sizeBytes: 4096,
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const findByIdForOrganizationWithAsset = vi
      .fn()
      .mockResolvedValue({ trustRecord, asset });
    const controller = buildController({ findByIdForOrganizationWithAsset });

    const result = await controller.getById("tr-1", { user: { organizationId: "org-1", sub: "user-1" } as never });

    expect(findByIdForOrganizationWithAsset).toHaveBeenCalledWith("org-1", "tr-1");
    expect(result.asset).toEqual({
      filename: "report.pdf",
      sizeBytes: 4096,
      uploadedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
  });

  it("maps a null filename asset as-is (fallback is a frontend concern, not the API's)", async () => {
    const trustRecord = buildTrustRecord();
    const asset = buildDigitalAsset({ filename: null, sizeBytes: 100 });
    const findByIdForOrganizationWithAsset = vi
      .fn()
      .mockResolvedValue({ trustRecord, asset });
    const controller = buildController({ findByIdForOrganizationWithAsset });

    const result = await controller.getById("tr-2", { user: { organizationId: "org-1", sub: "user-1" } as never });

    expect(result.asset.filename).toBeNull();
    expect(result.asset.sizeBytes).toBe(100);
  });

  it("throws NotFoundException (RNF-004: no cross-org existence leak) when the repository returns null", async () => {
    const findByIdForOrganizationWithAsset = vi.fn().mockResolvedValue(null);
    const controller = buildController({ findByIdForOrganizationWithAsset });

    await expect(
      controller.getById("tr-missing", { user: { organizationId: "org-1", sub: "user-1" } as never }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("TrustRecordsController.list (web-dtr-list: filtered pagination)", () => {
  function query(overrides: Partial<ListTrustRecordsQueryDto> = {}): ListTrustRecordsQueryDto {
    return { page: 1, pageSize: 20, ...overrides };
  }

  it("passes the org id, page/pageSize and an empty filter object through to the port, echoing page/pageSize", async () => {
    const findAllForOrganization = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = buildController({ findAllForOrganization });

    const result = await controller.list(query(), {
      user: { organizationId: "org-1", sub: "user-1" } as never,
    });

    expect(findAllForOrganization).toHaveBeenCalledWith("org-1", 1, 20, {});
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it("forwards search + state filters to the port when present", async () => {
    const findAllForOrganization = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = buildController({ findAllForOrganization });

    await controller.list(query({ page: 2, pageSize: 10, search: "contrato", state: TrustRecordState.CERTIFIED }), {
      user: { organizationId: "org-1", sub: "user-1" } as never,
    });

    expect(findAllForOrganization).toHaveBeenCalledWith("org-1", 2, 10, {
      search: "contrato",
      state: TrustRecordState.CERTIFIED,
    });
  });

  it("returns the port's items/total under the response envelope", async () => {
    const items = [
      { id: "tr-1", state: TrustRecordState.DRAFT, filename: "a.pdf", aiClassification: null, createdAt: new Date() },
    ];
    const findAllForOrganization = vi.fn().mockResolvedValue({ items, total: 1 });
    const controller = buildController({ findAllForOrganization });

    const result = await controller.list(query({ pageSize: 20 }), {
      user: { organizationId: "org-1", sub: "user-1" } as never,
    });

    expect(result).toEqual({ items, total: 1, page: 1, pageSize: 20 });
  });
});
