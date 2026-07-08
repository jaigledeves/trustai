import { beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../../domain/anchor.entity";
import { TrustRecord, TrustRecordState } from "../../../domain/trust-record.entity";
import type { AnchorRepositoryPort } from "../../../ports/anchor-repository.port";
import type { AnchorPort, AnchorSubmitResult } from "../../../ports/anchor.port";
import type { QueuePort } from "../../../ports/queue.port";
import type { TrustRecordRepositoryPort } from "../../../ports/trust-record-repository.port";
import { AnchorDtrHandler } from "./anchor-dtr.handler";
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
    "anchor-1", // anchorId
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
    updateAiAnalysis: vi.fn(),
    updateReviewFields: vi.fn(),
    confirmToReady: vi.fn(),
    discard: vi.fn(),
    submitForAnchoring: vi.fn(),
    certify: vi.fn().mockResolvedValue(undefined),
    markAnchoringFailed: vi.fn(),
    retryAnchoring: vi.fn(),
    ...overrides,
  };
}

function buildAnchorRepository(overrides: Partial<AnchorRepositoryPort> = {}): AnchorRepositoryPort {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(
      new Anchor("anchor-1", "base", "base-sepolia", null, null, null, AnchorStatus.PENDING, new Date(), new Date()),
    ),
    updateSubmissionResult: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const VALID_SUBMIT_RESULT: AnchorSubmitResult = {
  txHash: "0xtxhash",
  alreadyAnchored: false,
  anchoredAtBlockTimestamp: null,
};

function buildAnchorPort(overrides: Partial<AnchorPort> = {}): AnchorPort {
  return {
    submitAnchor: vi.fn().mockResolvedValue(VALID_SUBMIT_RESULT),
    getConfirmationStatus: vi.fn(),
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

describe("AnchorDtrHandler", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let anchorRepository: AnchorRepositoryPort;
  let anchorPort: AnchorPort;
  let queue: QueuePort;
  let handler: AnchorDtrHandler;

  const payload = { trustRecordId: "trust-record-1", canonicalHash: "a".repeat(64) };

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    anchorRepository = buildAnchorRepository();
    anchorPort = buildAnchorPort();
    queue = buildQueue();
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);
  });

  it("success: submits the anchor, persists the txHash as PENDING, and enqueues confirm-anchor", async () => {
    await handler.handle(payload);

    expect(anchorPort.submitAnchor).toHaveBeenCalledWith(payload.canonicalHash);
    expect(anchorRepository.updateSubmissionResult).toHaveBeenCalledWith("anchor-1", {
      txHash: "0xtxhash",
      status: AnchorStatus.PENDING,
    });
    expect(queue.send).toHaveBeenCalledWith(
      CONFIRM_ANCHOR_QUEUE,
      expect.objectContaining({
        trustRecordId: "trust-record-1",
        txHash: "0xtxhash",
        anchorId: "anchor-1",
        attemptStartedAt: expect.any(String),
      }),
    );
    expect(trustRecordRepository.certify).not.toHaveBeenCalled();
  });

  it("CRITICAL: AlreadyAnchored certifies the record IMMEDIATELY — no confirm-anchor enqueue, nothing to poll for", async () => {
    anchorPort = buildAnchorPort({
      submitAnchor: vi.fn().mockResolvedValue({
        txHash: null,
        alreadyAnchored: true,
        anchoredAtBlockTimestamp: new Date("2026-01-01T00:00:00.000Z"),
      }),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);

    await expect(handler.handle(payload)).resolves.toBeUndefined();

    expect(anchorRepository.updateSubmissionResult).toHaveBeenCalledWith("anchor-1", {
      txHash: null,
      status: AnchorStatus.CONFIRMED,
      blockTimestamp: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(trustRecordRepository.certify).toHaveBeenCalledWith("trust-record-1");
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("throws when the TrustRecord does not exist (durability: pg-boss will retry)", async () => {
    trustRecordRepository = buildTrustRecordRepository({ findById: vi.fn().mockResolvedValue(null) });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);

    await expect(handler.handle(payload)).rejects.toThrow(/TrustRecord not found/);
    expect(anchorRepository.updateSubmissionResult).not.toHaveBeenCalled();
  });

  it("throws when the TrustRecord has no linked Anchor", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findById: vi.fn().mockResolvedValue(buildTrustRecord({ anchorId: null })),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);

    await expect(handler.handle(payload)).rejects.toThrow(/no linked Anchor/);
  });

  it("propagates a real submission failure (network/RPC error) so pg-boss can retry", async () => {
    anchorPort = buildAnchorPort({
      submitAnchor: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);

    await expect(handler.handle(payload)).rejects.toThrow("RPC timeout");
    expect(anchorRepository.updateSubmissionResult).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("throws (does not silently swallow) if the record is somehow no longer ANCHORING when AlreadyAnchored fires", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findById: vi.fn().mockResolvedValue(buildTrustRecord({ state: TrustRecordState.CERTIFIED })),
    });
    anchorPort = buildAnchorPort({
      submitAnchor: vi.fn().mockResolvedValue({
        txHash: null,
        alreadyAnchored: true,
        anchoredAtBlockTimestamp: new Date(),
      }),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository, queue);

    await expect(handler.handle(payload)).rejects.toThrow();
    expect(trustRecordRepository.certify).not.toHaveBeenCalled();
  });
});
