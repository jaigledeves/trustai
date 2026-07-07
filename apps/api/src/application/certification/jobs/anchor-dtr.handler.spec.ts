import { beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../../domain/anchor.entity";
import { TrustRecord, TrustRecordState } from "../../../domain/trust-record.entity";
import type { AnchorRepositoryPort } from "../../../ports/anchor-repository.port";
import type { AnchorPort, AnchorSubmitResult } from "../../../ports/anchor.port";
import type { TrustRecordRepositoryPort } from "../../../ports/trust-record-repository.port";
import { AnchorDtrHandler } from "./anchor-dtr.handler";

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

function buildAnchorPort(overrides: Partial<AnchorPort> = {}): AnchorPort {
  return {
    submitAnchor: vi
      .fn()
      .mockResolvedValue({ txHash: "0xtxhash", alreadyAnchored: false } satisfies AnchorSubmitResult),
    ...overrides,
  };
}

describe("AnchorDtrHandler", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let anchorRepository: AnchorRepositoryPort;
  let anchorPort: AnchorPort;
  let handler: AnchorDtrHandler;

  const payload = { trustRecordId: "trust-record-1", canonicalHash: "a".repeat(64) };

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    anchorRepository = buildAnchorRepository();
    anchorPort = buildAnchorPort();
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository);
  });

  it("success: submits the anchor and persists the txHash as PENDING", async () => {
    await handler.handle(payload);

    expect(anchorPort.submitAnchor).toHaveBeenCalledWith(payload.canonicalHash);
    expect(anchorRepository.updateSubmissionResult).toHaveBeenCalledWith("anchor-1", {
      txHash: "0xtxhash",
      status: AnchorStatus.PENDING,
    });
  });

  it("CRITICAL: AlreadyAnchored is treated as success — persists CONFIRMED with a null txHash, does not throw", async () => {
    anchorPort = buildAnchorPort({
      submitAnchor: vi.fn().mockResolvedValue({ txHash: null, alreadyAnchored: true }),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository);

    await expect(handler.handle(payload)).resolves.toBeUndefined();

    expect(anchorRepository.updateSubmissionResult).toHaveBeenCalledWith("anchor-1", {
      txHash: null,
      status: AnchorStatus.CONFIRMED,
    });
  });

  it("throws when the TrustRecord does not exist (durability: pg-boss will retry)", async () => {
    trustRecordRepository = buildTrustRecordRepository({ findById: vi.fn().mockResolvedValue(null) });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository);

    await expect(handler.handle(payload)).rejects.toThrow(/TrustRecord not found/);
    expect(anchorRepository.updateSubmissionResult).not.toHaveBeenCalled();
  });

  it("throws when the TrustRecord has no linked Anchor", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findById: vi.fn().mockResolvedValue(buildTrustRecord({ anchorId: null })),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository);

    await expect(handler.handle(payload)).rejects.toThrow(/no linked Anchor/);
  });

  it("propagates a real submission failure (network/RPC error) so pg-boss can retry", async () => {
    anchorPort = buildAnchorPort({
      submitAnchor: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    });
    handler = new AnchorDtrHandler(anchorPort, trustRecordRepository, anchorRepository);

    await expect(handler.handle(payload)).rejects.toThrow("RPC timeout");
    expect(anchorRepository.updateSubmissionResult).not.toHaveBeenCalled();
  });
});
