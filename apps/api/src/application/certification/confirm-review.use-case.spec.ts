import { ConflictException, NotFoundException } from "@nestjs/common";
import { computeCanonicalHash } from "@trustai/dtr-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type { DigitalAssetRepositoryPort } from "../../ports/digital-asset-repository.port";
import type { TrustRecordRepositoryPort } from "../../ports/trust-record-repository.port";
import { ConfirmReviewUseCase } from "./confirm-review.use-case";

function buildTrustRecord(overrides: Partial<TrustRecord> = {}): TrustRecord {
  const base = new TrustRecord(
    "trust-record-1",
    "dtr-1",
    "asset-1",
    "sha-placeholder",
    null, // canonicalHash
    TrustRecordState.DRAFT,
    1,
    "A reviewed summary of the document.", // aiSummary
    "contrato", // aiClassification
    "es", // aiLanguage
    "stub", // aiProvider
    "stub-deterministic", // aiModel
    "1.0.0", // aiModelVersion
    "v1", // aiPromptVersion
    "v1", // aiTaxonomyVersion
    new Date("2026-07-05T18:30:00.000Z"), // aiAnalyzedAt
    null, // reviewedByUserId
    null, // anchorId
    new Date(),
    new Date(),
  );
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildDigitalAsset(overrides: Partial<DigitalAsset> = {}): DigitalAsset {
  const base = new DigitalAsset(
    "asset-1",
    "a".repeat(64),
    "application/pdf",
    2048,
    "contract.pdf",
    "org-1/a".repeat(1),
    AssetStatus.READY,
    "org-1",
    "user-1",
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
    updateReviewFields: vi.fn().mockResolvedValue(undefined),
    confirmToReady: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn(),
    submitForAnchoring: vi.fn().mockResolvedValue(undefined),
    certify: vi.fn(),
    markAnchoringFailed: vi.fn(),
    retryAnchoring: vi.fn(),
    findAllForOrganization: vi.fn(),
    ...overrides,
  };
}

function buildDigitalAssetRepository(
  overrides: Partial<DigitalAssetRepositoryPort> = {},
): DigitalAssetRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(buildDigitalAsset()),
    findBySha256: vi.fn(),
    createWithDraftRecord: vi.fn(),
    ...overrides,
  };
}

describe("ConfirmReviewUseCase", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let digitalAssetRepository: DigitalAssetRepositoryPort;
  let useCase: ConfirmReviewUseCase;

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    digitalAssetRepository = buildDigitalAssetRepository();
    useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);
  });

  describe("reviewEdit", () => {
    it("persists an edit while in DRAFT and sets reviewedByUserId", async () => {
      await useCase.reviewEdit({
        organizationId: "org-1",
        trustRecordId: "trust-record-1",
        reviewedByUserId: "user-1",
        summary: "An edited summary.",
      });

      expect(trustRecordRepository.updateReviewFields).toHaveBeenCalledWith("trust-record-1", {
        reviewedByUserId: "user-1",
        aiSummary: "An edited summary.",
      });
    });

    it("only includes explicitly-provided fields in the update (partial patch)", async () => {
      await useCase.reviewEdit({
        organizationId: "org-1",
        trustRecordId: "trust-record-1",
        reviewedByUserId: "user-1",
        classification: "factura",
      });

      const call = (trustRecordRepository.updateReviewFields as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[1];
      expect(call).toEqual({ reviewedByUserId: "user-1", aiClassification: "factura" });
      expect(call).not.toHaveProperty("aiSummary");
      expect(call).not.toHaveProperty("aiLanguage");
    });

    it("rejects edits once the record has left DRAFT (INV-21)", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi
          .fn()
          .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.READY })),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.reviewEdit({
          organizationId: "org-1",
          trustRecordId: "trust-record-1",
          reviewedByUserId: "user-1",
          summary: "Too late.",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(trustRecordRepository.updateReviewFields).not.toHaveBeenCalled();
    });

    it("returns 404 (not 403) for a missing or cross-org record", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi.fn().mockResolvedValue(null),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.reviewEdit({
          organizationId: "org-b",
          trustRecordId: "trust-record-1",
          reviewedByUserId: "user-2",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("confirm", () => {
    it("CRITICAL: canonicalHash matches dtr-core's own independent reference computation (INV-22)", async () => {
      const result = await useCase.confirm({
        organizationId: "org-1",
        trustRecordId: "trust-record-1",
      });

      // Independently reconstructed by the TEST, using dtr-core's own
      // computeCanonicalHash — not copied from the use case's internals.
      // If these two ever diverge, a verifier reproducing the hash
      // independently (the whole point of INV-22) would get a different
      // answer than TrustAI did.
      const reference = await computeCanonicalHash({
        schemaVersion: "dtr-1",
        asset: {
          sha256: "a".repeat(64),
          mimeType: "application/pdf",
          sizeBytes: 2048,
          filename: "contract.pdf",
        },
        analysis: {
          summary: "A reviewed summary of the document.",
          classification: "contrato",
          language: "es",
        },
        provenance: {
          provider: "stub",
          model: "stub-deterministic",
          modelVersion: "1.0.0",
          promptVersion: "v1",
          taxonomyVersion: "v1",
          analyzedAt: "2026-07-05T18:30:00.000Z",
        },
        issuedAt: result.issuedAt,
      });

      expect(result.canonicalHash).toBe(reference);
    });

    it("omits filename entirely (not null) when the asset has none — must match dtr-core's .optional() semantics", async () => {
      digitalAssetRepository = buildDigitalAssetRepository({
        findById: vi.fn().mockResolvedValue(buildDigitalAsset({ filename: null })),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      const result = await useCase.confirm({
        organizationId: "org-1",
        trustRecordId: "trust-record-1",
      });

      const referenceWithoutFilename = await computeCanonicalHash({
        schemaVersion: "dtr-1",
        asset: { sha256: "a".repeat(64), mimeType: "application/pdf", sizeBytes: 2048 },
        analysis: { summary: "A reviewed summary of the document.", classification: "contrato", language: "es" },
        provenance: {
          provider: "stub",
          model: "stub-deterministic",
          modelVersion: "1.0.0",
          promptVersion: "v1",
          taxonomyVersion: "v1",
          analyzedAt: "2026-07-05T18:30:00.000Z",
        },
        issuedAt: result.issuedAt,
      });

      expect(result.canonicalHash).toBe(referenceWithoutFilename);
    });

    it("transitions the record to READY and persists canonicalHash + issuedAt", async () => {
      const result = await useCase.confirm({
        organizationId: "org-1",
        trustRecordId: "trust-record-1",
      });

      expect(trustRecordRepository.confirmToReady).toHaveBeenCalledWith("trust-record-1", {
        canonicalHash: result.canonicalHash,
        issuedAt: result.issuedAt,
      });
    });

    it("never recomputes an already-set canonicalHash (INV-24)", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi.fn().mockResolvedValue(
          buildTrustRecord({ state: TrustRecordState.READY, canonicalHash: "a".repeat(64) }),
        ),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.confirm({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(trustRecordRepository.confirmToReady).not.toHaveBeenCalled();
    });

    it("rejects confirming from a non-DRAFT state (e.g. ANCHORING)", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi
          .fn()
          .mockResolvedValue(buildTrustRecord({ state: TrustRecordState.ANCHORING })),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.confirm({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(trustRecordRepository.confirmToReady).not.toHaveBeenCalled();
    });

    it("rejects confirming when analysis/provenance is incomplete (analyze-document never ran)", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi.fn().mockResolvedValue(
          buildTrustRecord({ aiSummary: null, aiProvider: null }),
        ),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.confirm({ organizationId: "org-1", trustRecordId: "trust-record-1" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(trustRecordRepository.confirmToReady).not.toHaveBeenCalled();
    });

    it("returns 404 for a missing or cross-org record", async () => {
      trustRecordRepository = buildTrustRecordRepository({
        findByIdForOrganization: vi.fn().mockResolvedValue(null),
      });
      useCase = new ConfirmReviewUseCase(trustRecordRepository, digitalAssetRepository);

      await expect(
        useCase.confirm({ organizationId: "org-b", trustRecordId: "trust-record-1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
