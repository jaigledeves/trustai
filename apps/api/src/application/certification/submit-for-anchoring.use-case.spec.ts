import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../domain/anchor.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import { ANCHOR_DTR_QUEUE } from "./jobs/anchor-dtr.handler";
import type { AnchorRepositoryPort } from "../../ports/anchor-repository.port";
import type { QueuePort, TransactionHandle } from "../../ports/queue.port";
import type { TrustRecordRepositoryPort } from "../../ports/trust-record-repository.port";
import { SubmitForAnchoringUseCase } from "./submit-for-anchoring.use-case";

const FAKE_TX: TransactionHandle = { $queryRawUnsafe: vi.fn() };

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base = new TrustRecord(
    "trust-record-1",
    "dtr-1",
    "asset-1",
    "sha-placeholder",
    "a".repeat(64), // canonicalHash — set by Phase 5's confirm
    TrustRecordState.READY,
    1,
    "summary",
    "contrato",
    "es",
    "stub",
    "stub-deterministic",
    "1.0.0",
    "v1",
    "v1",
    new Date(),
    "user-1",
    null, // anchorId
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
    findByIdForOrganizationWithAsset: vi.fn(),
    findByIdWithAssetAndAnchor: vi.fn(),
    updateAiAnalysis: vi.fn(),
    updateReviewFields: vi.fn(),
    confirmToReady: vi.fn(),
    discard: vi.fn(),
    // Simulates the real PrismaTrustRecordRepository: invokes the
    // caller's callback INSIDE its (fake) transaction — lets this
    // use-case-level test exercise real enqueue-inside-transaction wiring
    // against a fake queue port (same pattern as UploadAssetUseCase's spec).
    submitForAnchoring: vi.fn().mockImplementation(async (_id, _anchorId, onSubmittedWithinTransaction) => {
      if (onSubmittedWithinTransaction) {
        await onSubmittedWithinTransaction(FAKE_TX);
      }
    }),
    certify: vi.fn(),
    markAnchoringFailed: vi.fn(),
    retryAnchoring: vi.fn(),
    findAllForOrganization: vi.fn(),
    ...overrides,
  };
}

function buildAnchorRepository(overrides: Partial<AnchorRepositoryPort> = {}): AnchorRepositoryPort {
  return {
    create: vi.fn().mockResolvedValue(
      new Anchor("anchor-1", "base", "base-sepolia", null, null, null, AnchorStatus.PENDING, new Date(), new Date()),
    ),
    findById: vi.fn(),
    updateSubmissionResult: vi.fn(),
    ...overrides,
  };
}

function buildQueue(overrides: Partial<QueuePort> = {}): QueuePort {
  return {
    send: vi.fn().mockResolvedValue("job-1"),
    sendAfter: vi.fn().mockResolvedValue("job-1"),
    findLatestJobByTrustRecordId: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function buildConfigService(): ConfigService {
  return {
    get: vi.fn().mockReturnValue("base-sepolia"),
  } as unknown as ConfigService;
}

describe("SubmitForAnchoringUseCase", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let anchorRepository: AnchorRepositoryPort;
  let queue: QueuePort;
  let configService: ConfigService;
  let useCase: SubmitForAnchoringUseCase;

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    anchorRepository = buildAnchorRepository();
    queue = buildQueue();
    configService = buildConfigService();
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);
  });

  it("transitions READY->ANCHORING, creates an Anchor row, and enqueues anchor-dtr atomically", async () => {
    const result = await useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" });

    expect(result).toEqual({ trustRecordId: "trust-record-1", state: "ANCHORING" });
    expect(anchorRepository.create).toHaveBeenCalledWith({ chain: "base", network: "base-sepolia" });
    expect(trustRecordRepository.submitForAnchoring).toHaveBeenCalledWith(
      "trust-record-1",
      "anchor-1",
      expect.any(Function),
    );
    expect(queue.send).toHaveBeenCalledWith(
      ANCHOR_DTR_QUEUE,
      { trustRecordId: "trust-record-1", canonicalHash: "a".repeat(64) },
      FAKE_TX,
    );
  });

  it("rejects when the record is not READY (e.g. still DRAFT)", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findByIdForOrganization: vi
        .fn()
        .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.DRAFT })),
    });
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(anchorRepository.create).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("rejects when already ANCHORING (no duplicate submission)", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findByIdForOrganization: vi
        .fn()
        .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.ANCHORING })),
    });
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects when canonicalHash is missing (defense-in-depth — should not happen if READY)", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findByIdForOrganization: vi
        .fn()
        .mockResolvedValue(buildTrustRecord({ canonicalHash: null })),
    });
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(anchorRepository.create).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing or cross-org record", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findByIdForOrganization: vi.fn().mockResolvedValue(null),
    });
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);

    await expect(
      useCase.execute({ organizationId: "org-b", trustRecordId: "trust-record-1" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not enqueue if the transaction rolls back (submitForAnchoring rejects)", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      submitForAnchoring: vi.fn().mockRejectedValue(new Error("simulated rollback")),
    });
    useCase = new SubmitForAnchoringUseCase(trustRecordRepository, anchorRepository, queue, configService);

    await expect(
      useCase.execute({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
    ).rejects.toThrow("simulated rollback");
  });
});
