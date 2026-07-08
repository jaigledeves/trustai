import { sha256Hex } from "@trustai/dtr-core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../domain/anchor.entity";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type { AnchorPort } from "../../ports/anchor.port";
import type {
  TrustRecordRepositoryPort,
  TrustRecordWithAssetAndAnchor,
} from "../../ports/trust-record-repository.port";
import type { VerificationAttemptRepositoryPort } from "../../ports/verification-attempt-repository.port";
import { EIDAS_DISCLAIMER } from "./eidas-disclaimer";
import { VerifyDocumentUseCase } from "./verify-document.use-case";

const ISSUED_AT = "2026-07-05T18:30:00.000Z";
const MATCHING_BYTES = new TextEncoder().encode("hello world - trustai fixture");
const MISMATCHED_BYTES = new TextEncoder().encode("hello world - trustai fixture - tampered");

let MATCHING_SHA256: string;

beforeAll(async () => {
  MATCHING_SHA256 = await sha256Hex(MATCHING_BYTES);
});

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base = new TrustRecord(
    "trust-record-1",
    "dtr-1",
    "asset-1",
    "sha-placeholder",
    "a".repeat(64), // canonicalHash — set at confirm time
    TrustRecordState.CERTIFIED,
    1,
    "A reviewed summary of the document.",
    "contrato",
    "es",
    "stub",
    "stub-deterministic",
    "1.0.0",
    "v1",
    "v1",
    new Date("2026-07-05T18:30:00.000Z"),
    "user-1",
    "anchor-1",
    new Date(),
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildDigitalAsset(overrides: Partial<DigitalAsset> = {}): DigitalAsset {
  const base = new DigitalAsset(
    "asset-1",
    MATCHING_SHA256,
    "application/pdf",
    MATCHING_BYTES.length,
    "contract.pdf",
    "org-1/asset-1",
    AssetStatus.READY,
    "org-1",
    "user-1",
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildAnchor(overrides: Partial<Anchor> = {}): Anchor {
  const base = new Anchor(
    "anchor-1",
    "base",
    "base-sepolia",
    "0xtxhash",
    null,
    new Date("2026-07-06T00:00:00.000Z"),
    AnchorStatus.CONFIRMED,
    new Date(),
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildFound(
  overrides: Partial<TrustRecordWithAssetAndAnchor> = {},
): TrustRecordWithAssetAndAnchor {
  return {
    trustRecord: buildTrustRecord(),
    issuedAt: ISSUED_AT,
    asset: buildDigitalAsset(),
    anchor: buildAnchor(),
    ...overrides,
  };
}

function buildTrustRecordRepository(
  overrides: Partial<TrustRecordRepositoryPort> = {},
): TrustRecordRepositoryPort {
  return {
    findById: vi.fn(),
    findByIdForOrganization: vi.fn(),
    findByIdWithAssetAndAnchor: vi.fn().mockResolvedValue(buildFound()),
    updateAiAnalysis: vi.fn(),
    updateReviewFields: vi.fn(),
    confirmToReady: vi.fn(),
    discard: vi.fn(),
    submitForAnchoring: vi.fn(),
    certify: vi.fn(),
    markAnchoringFailed: vi.fn(),
    retryAnchoring: vi.fn(),
    findAllForOrganization: vi.fn(),
    ...overrides,
  };
}

function buildAnchorPort(overrides: Partial<AnchorPort> = {}): AnchorPort {
  return {
    submitAnchor: vi.fn(),
    getConfirmationStatus: vi.fn(),
    isAnchored: vi
      .fn()
      .mockResolvedValue({ anchored: true, blockTimestamp: new Date("2026-07-06T00:00:00.000Z") }),
    ...overrides,
  };
}

function buildVerificationAttemptRepository(
  overrides: Partial<VerificationAttemptRepositoryPort> = {},
): VerificationAttemptRepositoryPort {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("VerifyDocumentUseCase", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let anchorPort: AnchorPort;
  let verificationAttemptRepository: VerificationAttemptRepositoryPort;
  let useCase: VerifyDocumentUseCase;

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    anchorPort = buildAnchorPort();
    verificationAttemptRepository = buildVerificationAttemptRepository();
    useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);
  });

  describe("verifyByHash", () => {
    it("unknown id -> INVALID_RECORD, resolved=false, no attempt logged, no analysis", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdWithAssetAndAnchor: vi.fn().mockResolvedValue(null),
      });
      useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

      const result = await useCase.verifyByHash({ trustRecordId: "unknown-id", channel: "URL" });

      expect(result.resolved).toBe(false);
      expect(result.verdict).toBe("INVALID_RECORD");
      expect(result.analysis).toBeNull();
      expect(verificationAttemptRepository.record).not.toHaveBeenCalled();
    });

    it.each([TrustRecordState.DRAFT, TrustRecordState.DISCARDED, TrustRecordState.FAILED])(
      "%s -> INVALID_RECORD, attempt logged, no analysis",
      async (state) => {
        trustRecordRepository = buildTrustRecordRepository({
          findByIdWithAssetAndAnchor: vi.fn().mockResolvedValue(buildFound({ trustRecord: buildTrustRecord({ state }) })),
        });
        useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

        const result = await useCase.verifyByHash({ trustRecordId: "trust-record-1", channel: "QR" });

        expect(result.resolved).toBe(true);
        expect(result.verdict).toBe("INVALID_RECORD");
        expect(result.analysis).toBeNull();
        expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
          trustRecordId: "trust-record-1",
          type: "HASH_ONLY",
          verdict: "INVALID_RECORD",
          channel: "QR",
        });
      },
    );

    it.each([TrustRecordState.READY, TrustRecordState.ANCHORING])(
      "%s -> PENDING_ANCHOR, no analysis leaked (INV-41), no chain data confirmed",
      async (state) => {
        trustRecordRepository = buildTrustRecordRepository({
          findByIdWithAssetAndAnchor: vi.fn().mockResolvedValue(buildFound({ trustRecord: buildTrustRecord({ state }) })),
        });
        useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

        const result = await useCase.verifyByHash({ trustRecordId: "trust-record-1", channel: "URL" });

        expect(result.verdict).toBe("PENDING_ANCHOR");
        expect(result.analysis).toBeNull();
        expect(result.chainAnchor?.anchored).toBe(false);
        expect(anchorPort.isAnchored).not.toHaveBeenCalled();
        expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
          trustRecordId: "trust-record-1",
          type: "HASH_ONLY",
          verdict: "PENDING_ANCHOR",
          channel: "URL",
        });
      },
    );

    it("CERTIFIED -> VALID with anchor data, no analysis leaked (INV-41)", async () => {
      const result = await useCase.verifyByHash({ trustRecordId: "trust-record-1", channel: "QR" });

      expect(result.verdict).toBe("VALID");
      expect(result.analysis).toBeNull();
      expect(result.chainAnchor).toEqual({
        anchored: true,
        txHash: "0xtxhash",
        blockTimestamp: new Date("2026-07-06T00:00:00.000Z"),
        chainReadUnavailable: false,
      });
      expect(anchorPort.isAnchored).toHaveBeenCalledWith("a".repeat(64));
      expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
        trustRecordId: "trust-record-1",
        type: "HASH_ONLY",
        verdict: "VALID",
        channel: "QR",
      });
    });

    it("CERTIFIED + RPC read failure -> falls back to DB Anchor.status, chainReadUnavailable=true, never throws", async () => {
      anchorPort = buildAnchorPort({ isAnchored: vi.fn().mockRejectedValue(new Error("RPC down")) });
      useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

      const result = await useCase.verifyByHash({ trustRecordId: "trust-record-1", channel: "URL" });

      expect(result.verdict).toBe("VALID");
      expect(result.chainAnchor).toEqual({
        anchored: true, // DB Anchor.status is CONFIRMED
        txHash: "0xtxhash",
        blockTimestamp: new Date("2026-07-06T00:00:00.000Z"),
        chainReadUnavailable: true,
      });
    });

    it("includes the eIDAS disclaimer and a plain-language explanation on every verdict", async () => {
      const result = await useCase.verifyByHash({ trustRecordId: "trust-record-1", channel: "URL" });

      expect(result.disclaimer).toBe(EIDAS_DISCLAIMER);
      expect(result.explanation).toEqual(expect.any(String));
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  describe("verifyByUpload", () => {
    it("unknown id -> INVALID_RECORD, resolved=false, no attempt logged, no analysis", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdWithAssetAndAnchor: vi.fn().mockResolvedValue(null),
      });
      useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

      const result = await useCase.verifyByUpload({
        trustRecordId: "unknown-id",
        fileBytes: MATCHING_BYTES,
        channel: "URL",
      });

      expect(result.resolved).toBe(false);
      expect(result.verdict).toBe("INVALID_RECORD");
      expect(result.analysis).toBeNull();
      expect(verificationAttemptRepository.record).not.toHaveBeenCalled();
    });

    it("non-certifiable state (DRAFT) -> INVALID_RECORD, no analysis, attempt logged FULL", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdWithAssetAndAnchor: vi
          .fn()
          .mockResolvedValue(buildFound({ trustRecord: buildTrustRecord({ state: TrustRecordState.DRAFT }) })),
      });
      useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

      const result = await useCase.verifyByUpload({
        trustRecordId: "trust-record-1",
        fileBytes: MATCHING_BYTES,
        channel: "HASH",
      });

      expect(result.verdict).toBe("INVALID_RECORD");
      expect(result.analysis).toBeNull();
      expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
        trustRecordId: "trust-record-1",
        type: "FULL",
        verdict: "INVALID_RECORD",
        channel: "HASH",
      });
    });

    it("matching hash + CERTIFIED + confirmed anchor -> VALID with analysis", async () => {
      const result = await useCase.verifyByUpload({
        trustRecordId: "trust-record-1",
        fileBytes: MATCHING_BYTES,
        channel: "QR",
      });

      expect(result.verdict).toBe("VALID");
      expect(result.analysis).toEqual({
        summary: "A reviewed summary of the document.",
        classification: "contrato",
        language: "es",
      });
      expect(result.chainAnchor?.anchored).toBe(true);
      expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
        trustRecordId: "trust-record-1",
        type: "FULL",
        verdict: "VALID",
        channel: "QR",
      });
    });

    it("one-byte diff -> ASSET_MISMATCH, analysis withheld", async () => {
      const result = await useCase.verifyByUpload({
        trustRecordId: "trust-record-1",
        fileBytes: MISMATCHED_BYTES,
        channel: "URL",
      });

      expect(result.verdict).toBe("ASSET_MISMATCH");
      expect(result.analysis).toBeNull();
      expect(verificationAttemptRepository.record).toHaveBeenCalledWith({
        trustRecordId: "trust-record-1",
        type: "FULL",
        verdict: "ASSET_MISMATCH",
        channel: "URL",
      });
    });

    it.each([TrustRecordState.READY, TrustRecordState.ANCHORING])(
      "matching hash + %s (not yet anchored) -> PENDING_ANCHOR with analysis, no chain data confirmed",
      async (state) => {
        trustRecordRepository = buildTrustRecordRepository({
          findByIdWithAssetAndAnchor: vi
            .fn()
            .mockResolvedValue(buildFound({ trustRecord: buildTrustRecord({ state, canonicalHash: null }) })),
        });
        useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

        const result = await useCase.verifyByUpload({
          trustRecordId: "trust-record-1",
          fileBytes: MATCHING_BYTES,
          channel: "URL",
        });

        expect(result.verdict).toBe("PENDING_ANCHOR");
        expect(result.analysis).toEqual({
          summary: "A reviewed summary of the document.",
          classification: "contrato",
          language: "es",
        });
        expect(result.chainAnchor?.anchored).toBe(false);
        expect(anchorPort.isAnchored).not.toHaveBeenCalled();
      },
    );

    it("CERTIFIED + matching hash + RPC read failure -> falls back to DB Anchor.status, never throws", async () => {
      anchorPort = buildAnchorPort({ isAnchored: vi.fn().mockRejectedValue(new Error("RPC down")) });
      useCase = new VerifyDocumentUseCase(trustRecordRepository, anchorPort, verificationAttemptRepository);

      const result = await useCase.verifyByUpload({
        trustRecordId: "trust-record-1",
        fileBytes: MATCHING_BYTES,
        channel: "URL",
      });

      expect(result.verdict).toBe("VALID");
      expect(result.chainAnchor).toEqual({
        anchored: true,
        txHash: "0xtxhash",
        blockTimestamp: new Date("2026-07-06T00:00:00.000Z"),
        chainReadUnavailable: true,
      });
    });

    it("includes the eIDAS disclaimer and a plain-language explanation on every verdict", async () => {
      const result = await useCase.verifyByUpload({
        trustRecordId: "trust-record-1",
        fileBytes: MATCHING_BYTES,
        channel: "URL",
      });

      expect(result.disclaimer).toBe(EIDAS_DISCLAIMER);
      expect(result.explanation).toEqual(expect.any(String));
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });
});
