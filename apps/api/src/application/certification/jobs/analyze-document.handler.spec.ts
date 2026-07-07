import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStatus, DigitalAsset } from "../../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../../domain/trust-record.entity";
import type { AiAnalysisPort, AiAnalysisRawResult } from "../../../ports/ai-analysis.port";
import type { DigitalAssetRepositoryPort } from "../../../ports/digital-asset-repository.port";
import type { EncryptionPort } from "../../../ports/encryption.port";
import { NoTextLayerError, type TextExtractionPort } from "../../../ports/text-extraction.port";
import type { StoragePort } from "../../../ports/storage.port";
import type { TrustRecordRepositoryPort } from "../../../ports/trust-record-repository.port";
import {
  AiAnalysisValidationError,
  AnalyzeDocumentHandler,
} from "./analyze-document.handler";

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

function buildDigitalAsset(overrides: Partial<DigitalAsset> = {}): DigitalAsset {
  const base = new DigitalAsset(
    "asset-1",
    "sha-placeholder",
    "application/pdf",
    1024,
    "contract.pdf",
    "org-1/sha-placeholder",
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
    findById: vi.fn().mockResolvedValue(buildTrustRecord()),
    findByIdForOrganization: vi.fn().mockResolvedValue(buildTrustRecord()),
    updateAiAnalysis: vi.fn().mockResolvedValue(undefined),
    updateReviewFields: vi.fn().mockResolvedValue(undefined),
    confirmToReady: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn().mockResolvedValue(undefined),
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

function buildStorage(overrides: Partial<StoragePort> = {}): StoragePort {
  return {
    putObject: vi.fn(),
    getObject: vi.fn().mockResolvedValue(Buffer.from("encrypted-bytes")),
    ...overrides,
  };
}

function buildEncryption(overrides: Partial<EncryptionPort> = {}): EncryptionPort {
  return {
    encrypt: vi.fn(),
    decrypt: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 plaintext bytes")),
    ...overrides,
  };
}

function buildTextExtraction(overrides: Partial<TextExtractionPort> = {}): TextExtractionPort {
  return {
    extractText: vi.fn().mockResolvedValue("extracted PDF text"),
    ...overrides,
  };
}

const VALID_ANALYSIS_RESULT: AiAnalysisRawResult = {
  analysis: {
    summary: "A valid deterministic summary of the document.",
    classification: "contrato",
    language: "es",
  },
  provenance: {
    provider: "stub",
    model: "stub-deterministic",
    modelVersion: "1.0.0",
    promptVersion: "v1",
    taxonomyVersion: "v1",
  },
};

function buildAiAnalysis(overrides: Partial<AiAnalysisPort> = {}): AiAnalysisPort {
  return {
    analyze: vi.fn().mockResolvedValue(VALID_ANALYSIS_RESULT),
    ...overrides,
  };
}

describe("AnalyzeDocumentHandler", () => {
  let trustRecordRepository: TrustRecordRepositoryPort;
  let digitalAssetRepository: DigitalAssetRepositoryPort;
  let storage: StoragePort;
  let encryption: EncryptionPort;
  let textExtraction: TextExtractionPort;
  let aiAnalysis: AiAnalysisPort;
  let handler: AnalyzeDocumentHandler;

  const payload = { trustRecordId: "trust-record-1", assetId: "asset-1", organizationId: "org-1" };

  beforeEach(() => {
    trustRecordRepository = buildTrustRecordRepository();
    digitalAssetRepository = buildDigitalAssetRepository();
    storage = buildStorage();
    encryption = buildEncryption();
    textExtraction = buildTextExtraction();
    aiAnalysis = buildAiAnalysis();
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );
  });

  it("success: writes AI fields + provenance to the DRAFT record", async () => {
    await handler.handle(payload);

    expect(trustRecordRepository.updateAiAnalysis).toHaveBeenCalledWith("trust-record-1", {
      aiSummary: "A valid deterministic summary of the document.",
      aiClassification: "contrato",
      aiLanguage: "es",
      aiProvider: "stub",
      aiModel: "stub-deterministic",
      aiModelVersion: "1.0.0",
      aiPromptVersion: "v1",
      aiTaxonomyVersion: "v1",
      aiAnalyzedAt: expect.any(Date),
    });
  });

  it("decrypts the storage bytes before extracting text", async () => {
    await handler.handle(payload);

    expect(storage.getObject).toHaveBeenCalledWith("org-1/sha-placeholder");
    expect(encryption.decrypt).toHaveBeenCalledWith(Buffer.from("encrypted-bytes"));
    expect(textExtraction.extractText).toHaveBeenCalledWith(
      Buffer.from("%PDF-1.4 plaintext bytes"),
    );
  });

  it("no-text-layer: propagates NoTextLayerError visibly and writes nothing", async () => {
    textExtraction = buildTextExtraction({
      extractText: vi.fn().mockRejectedValue(new NoTextLayerError()),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toBeInstanceOf(NoTextLayerError);
    expect(trustRecordRepository.updateAiAnalysis).not.toHaveBeenCalled();
  });

  it("provider failure (timeout/5xx): propagates the error and writes NO partial fields", async () => {
    aiAnalysis = buildAiAnalysis({
      analyze: vi.fn().mockRejectedValue(new Error("upstream timeout")),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toThrow("upstream timeout");
    expect(trustRecordRepository.updateAiAnalysis).not.toHaveBeenCalled();
  });

  it("schema-invalid response: rejects with AiAnalysisValidationError and writes nothing", async () => {
    aiAnalysis = buildAiAnalysis({
      analyze: vi.fn().mockResolvedValue({
        analysis: { summary: "", classification: "not-a-real-taxonomy-value", language: "spanish" },
        provenance: VALID_ANALYSIS_RESULT.provenance,
      }),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toBeInstanceOf(AiAnalysisValidationError);
    expect(trustRecordRepository.updateAiAnalysis).not.toHaveBeenCalled();
  });

  it("INV-21 defense-in-depth: a non-DRAFT record is rejected before any I/O happens", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findById: vi.fn().mockResolvedValue(buildTrustRecord({ state: TrustRecordState.READY })),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toThrow();
    expect(digitalAssetRepository.findById).not.toHaveBeenCalled();
    expect(storage.getObject).not.toHaveBeenCalled();
    expect(trustRecordRepository.updateAiAnalysis).not.toHaveBeenCalled();
  });

  it("throws when the TrustRecord does not exist", async () => {
    trustRecordRepository = buildTrustRecordRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toThrow(/TrustRecord not found/);
  });

  it("throws when the DigitalAsset does not exist", async () => {
    digitalAssetRepository = buildDigitalAssetRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    handler = new AnalyzeDocumentHandler(
      trustRecordRepository,
      digitalAssetRepository,
      storage,
      encryption,
      textExtraction,
      aiAnalysis,
    );

    await expect(handler.handle(payload)).rejects.toThrow(/DigitalAsset not found/);
    expect(trustRecordRepository.updateAiAnalysis).not.toHaveBeenCalled();
  });
});
