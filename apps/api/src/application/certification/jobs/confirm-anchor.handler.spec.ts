import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../../domain/anchor.entity";
import { TrustRecord, TrustRecordState } from "../../../domain/trust-record.entity";
import type { AnchorRepositoryPort } from "../../../ports/anchor-repository.port";
import type { AnchorPort, ConfirmationStatus } from "../../../ports/anchor.port";
import type { QueuePort } from "../../../ports/queue.port";
import type { TrustRecordRepositoryPort } from "../../../ports/trust-record-repository.port";
import { ANCHOR_DTR_QUEUE } from "./anchor-dtr.handler";
import { ConfirmAnchorHandler } from "./confirm-anchor.handler";
import { CONFIRM_ANCHOR_QUEUE } from "./queue-names";

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base = new TrustRecord(
    "trust-record-1",
    "dtr-1",
    "asset-1",
    "sha-placeholder",
    "a".repeat(64), // canonicalHash
    TrustRecordState.ANCHORING,
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
    "anchor-1",
    new Date(),
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildTrustRecordRepository(
  overrides: Partial<TrustRecordRepositoryPort> = {},
): TrustRecordRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(buildTrustRecord()),
    findByIdForOrganization: vi.fn(),
    findByIdForOrganizationWithAsset: vi.fn(),
    findByIdWithAssetAndAnchor: vi.fn(),
    updateAiAnalysis: vi.fn(),
    updateReviewFields: vi.fn(),
    confirmToReady: vi.fn(),
    discard: vi.fn(),
    submitForAnchoring: vi.fn(),
    certify: vi.fn().mockResolvedValue(undefined),
    markAnchoringFailed: vi.fn().mockResolvedValue(undefined),
    retryAnchoring: vi.fn().mockImplementation(async (_id, onRetryWithinTransaction) => {
      if (onRetryWithinTransaction) {
        await onRetryWithinTransaction({ $queryRawUnsafe: vi.fn() });
      }
    }),
    findAllForOrganization: vi.fn(),
    ...overrides,
  };
}

function buildAnchorRepository(overrides: Partial<AnchorRepositoryPort> = {}): AnchorRepositoryPort {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(
      new Anchor("anchor-1", "base", "base-sepolia", "0xtxhash", null, null, AnchorStatus.PENDING, new Date(), new Date()),
    ),
    updateSubmissionResult: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildAnchorPort(overrides: Partial<AnchorPort> = {}): AnchorPort {
  return {
    submitAnchor: vi.fn(),
    getConfirmationStatus: vi
      .fn()
      .mockResolvedValue({ confirmations: 0, blockTimestamp: null } satisfies ConfirmationStatus),
    isAnchored: vi.fn(),
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

function buildConfigService(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: vi.fn((key: string, fallback?: string) => overrides[key] ?? fallback),
  } as unknown as ConfigService;
}

describe("ConfirmAnchorHandler", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let anchorRepository: AnchorRepositoryPort;
  let anchorPort: AnchorPort;
  let queue: QueuePort;
  let configService: ConfigService;
  let handler: ConfirmAnchorHandler;

  const basePayload = {
    trustRecordId: "trust-record-1",
    txHash: "0xtxhash",
    anchorId: "anchor-1",
    attemptStartedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    anchorRepository = buildAnchorRepository();
    anchorPort = buildAnchorPort();
    queue = buildQueue();
    configService = buildConfigService();
    handler = new ConfirmAnchorHandler(
      anchorPort,
      trustRecordRepository,
      anchorRepository,
      queue,
      configService,
    );
  });

  it("CRITICAL: certifies the record once 2 confirmations are observed (INV-32) — persists txHash+blockTimestamp", async () => {
    const blockTimestamp = new Date("2026-06-01T12:00:00.000Z");
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi.fn().mockResolvedValue({ confirmations: 2, blockTimestamp }),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    await handler.handle(basePayload);

    expect(anchorRepository.updateSubmissionResult).toHaveBeenCalledWith("anchor-1", {
      txHash: "0xtxhash",
      status: AnchorStatus.CONFIRMED,
      blockTimestamp,
    });
    expect(trustRecordRepository.certify).toHaveBeenCalledWith("trust-record-1");
    expect(queue.sendAfter).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("certifies with more than 2 confirmations too (>= 2, not exactly 2)", async () => {
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi
        .fn()
        .mockResolvedValue({ confirmations: 5, blockTimestamp: new Date() }),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    await handler.handle(basePayload);

    expect(trustRecordRepository.certify).toHaveBeenCalledWith("trust-record-1");
  });

  it("self-requeues via sendAfter with the configured poll interval when not yet confirmed and not timed out", async () => {
    configService = buildConfigService({ CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS: "7" });
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi.fn().mockResolvedValue({ confirmations: 1, blockTimestamp: new Date() }),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    const recentPayload = { ...basePayload, attemptStartedAt: new Date().toISOString() };
    await handler.handle(recentPayload);

    expect(queue.sendAfter).toHaveBeenCalledWith(CONFIRM_ANCHOR_QUEUE, recentPayload, 7);
    expect(trustRecordRepository.certify).not.toHaveBeenCalled();
    expect(anchorRepository.updateSubmissionResult).not.toHaveBeenCalled();
  });

  it("CRITICAL: on timeout, moves ANCHORING->FAILED then FAILED->ANCHORING and re-enqueues anchor-dtr (RF-033 automatic retry)", async () => {
    configService = buildConfigService({ CONFIRM_ANCHOR_TIMEOUT_SECONDS: "600" });
    const longAgo = new Date(Date.now() - 700_000).toISOString(); // > 600s ago
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi.fn().mockResolvedValue({ confirmations: 0, blockTimestamp: null }),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    await handler.handle({ ...basePayload, attemptStartedAt: longAgo });

    expect(trustRecordRepository.markAnchoringFailed).toHaveBeenCalledWith("trust-record-1");
    expect(trustRecordRepository.retryAnchoring).toHaveBeenCalledWith(
      "trust-record-1",
      expect.any(Function),
    );
    expect(queue.send).toHaveBeenCalledWith(
      ANCHOR_DTR_QUEUE,
      { trustRecordId: "trust-record-1", canonicalHash: "a".repeat(64) },
      expect.anything(),
    );
    expect(queue.sendAfter).not.toHaveBeenCalled();
    expect(trustRecordRepository.certify).not.toHaveBeenCalled();
  });

  it("throws when the TrustRecord no longer exists", async () => {
    trustRecordRepository = buildTrustRecordRepository({ findById: vi.fn().mockResolvedValue(null) });
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi.fn().mockResolvedValue({ confirmations: 2, blockTimestamp: new Date() }),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    await expect(handler.handle(basePayload)).rejects.toThrow(/TrustRecord not found/);
  });

  it("propagates a real RPC failure from getConfirmationStatus (pg-boss retries the job itself)", async () => {
    anchorPort = buildAnchorPort({
      getConfirmationStatus: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    });
    handler = new ConfirmAnchorHandler(anchorPort, trustRecordRepository, anchorRepository, queue, configService);

    await expect(handler.handle(basePayload)).rejects.toThrow("RPC timeout");
    expect(queue.sendAfter).not.toHaveBeenCalled();
  });
});
