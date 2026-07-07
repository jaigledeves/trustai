import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type { TrustRecordRepositoryPort } from "../../ports/trust-record-repository.port";
import { DiscardDraftUseCase } from "./discard-draft.use-case";

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base = new TrustRecord(
    "trust-record-1",
    "dtr-1",
    "asset-1",
    "sha-placeholder",
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
    new Date(),
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildTrustRecordRepository(
  overrides: Partial<TrustRecordRepositoryPort> = {},
): TrustRecordRepositoryPort {
  return {
    findById: vi.fn(),
    findByIdForOrganization: vi.fn().mockResolvedValue(buildTrustRecord()),
    updateAiAnalysis: vi.fn(),
    updateReviewFields: vi.fn(),
    confirmToReady: vi.fn(),
    discard: vi.fn().mockResolvedValue(undefined),
    submitForAnchoring: vi.fn(),
    ...overrides,
  };
}

describe("DiscardDraftUseCase", () => {
  let repository: TrustRecordRepositoryPort;
  let useCase: DiscardDraftUseCase;

  beforeEach(() => {
    repository = buildTrustRecordRepository();
    useCase = new DiscardDraftUseCase(repository);
  });

  it("discards a DRAFT record (dtr-lifecycle: DRAFT->DISCARDED)", async () => {
    await useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" });

    expect(repository.discard).toHaveBeenCalledWith("trust-record-1");
  });

  it("rejects discarding a non-DRAFT record (e.g. already READY)", async () => {
    repository = buildTrustRecordRepository({
      findByIdForOrganization: vi
        .fn()
        .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.READY })),
    });
    useCase = new DiscardDraftUseCase(repository);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.discard).not.toHaveBeenCalled();
  });

  it("rejects discarding an already-CERTIFIED record (INV-23 full immutability)", async () => {
    repository = buildTrustRecordRepository({
      findByIdForOrganization: vi
        .fn()
        .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.CERTIFIED })),
    });
    useCase = new DiscardDraftUseCase(repository);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.discard).not.toHaveBeenCalled();
  });

  it("returns 404 (not 403) for a missing or cross-org record", async () => {
    repository = buildTrustRecordRepository({
      findByIdForOrganization: vi.fn().mockResolvedValue(null),
    });
    useCase = new DiscardDraftUseCase(repository);

    await expect(
      useCase.execute({ organizationId: "org-b", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
