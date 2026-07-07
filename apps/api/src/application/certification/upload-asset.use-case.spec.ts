import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import type {
  AssetWithDraftRecord,
  DigitalAssetRepositoryPort,
} from "../../ports/digital-asset-repository.port";
import type { EncryptionPort } from "../../ports/encryption.port";
import type { StoragePort } from "../../ports/storage.port";
import { UploadAssetUseCase } from "./upload-asset.use-case";

function buildRepository(overrides: Partial<DigitalAssetRepositoryPort> = {}): DigitalAssetRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findBySha256: vi.fn().mockResolvedValue(null),
    createWithDraftRecord: vi.fn().mockResolvedValue({
      asset: new DigitalAsset(
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
      ),
      trustRecordId: "trust-record-1",
    } satisfies AssetWithDraftRecord),
    ...overrides,
  };
}

function buildStorage(overrides: Partial<StoragePort> = {}): StoragePort {
  return {
    putObject: vi.fn().mockResolvedValue(undefined),
    getObject: vi.fn(),
    ...overrides,
  };
}

function buildEncryption(overrides: Partial<EncryptionPort> = {}): EncryptionPort {
  return {
    encrypt: vi.fn().mockImplementation(async (plaintext: Buffer) =>
      Buffer.concat([Buffer.from("fake-iv-tag-"), plaintext]),
    ),
    decrypt: vi.fn(),
    ...overrides,
  };
}

const PDF_BYTES = Buffer.from("%PDF-1.4 fake pdf content for hashing tests");
const REFERENCE_SHA256 = createHash("sha256").update(PDF_BYTES).digest("hex");

describe("UploadAssetUseCase", () => {
  let repository: DigitalAssetRepositoryPort;
  let storage: StoragePort;
  let encryption: EncryptionPort;
  let useCase: UploadAssetUseCase;

  beforeEach(() => {
    repository = buildRepository();
    storage = buildStorage();
    encryption = buildEncryption();
    useCase = new UploadAssetUseCase(repository, storage, encryption);
  });

  it("computes the SHA-256 of the raw bytes exactly once and passes it through unchanged (INV-10)", async () => {
    await useCase.execute({
      organizationId: "org-1",
      createdByUserId: "user-1",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    expect(repository.findBySha256).toHaveBeenCalledWith("org-1", REFERENCE_SHA256);
    const createArgs = (repository.createWithDraftRecord as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(createArgs.sha256).toBe(REFERENCE_SHA256);
  });

  it("encrypts the plaintext before calling StoragePort.putObject (INV-12: storage only ever sees ciphertext)", async () => {
    await useCase.execute({
      organizationId: "org-1",
      createdByUserId: "user-1",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    expect(encryption.encrypt).toHaveBeenCalledWith(PDF_BYTES);
    const putArgs = (storage.putObject as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(putArgs.body.equals(PDF_BYTES)).toBe(false);
    expect(putArgs.body.includes(PDF_BYTES)).toBe(true); // fake encrypt prefixes a marker
  });

  it("creates the asset with the storage key returned to the repository as storageRef", async () => {
    await useCase.execute({
      organizationId: "org-1",
      createdByUserId: "user-1",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    const putArgs = (storage.putObject as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const createArgs = (repository.createWithDraftRecord as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(createArgs.storageRef).toBe(putArgs.key);
    expect(createArgs.organizationId).toBe("org-1");
    expect(createArgs.createdByUserId).toBe("user-1");
    expect(createArgs.mimeType).toBe("application/pdf");
    expect(createArgs.filename).toBe("contract.pdf");
    expect(createArgs.sizeBytes).toBe(PDF_BYTES.byteLength);
  });

  it("returns the new asset/trustRecord ids with duplicate:false for a fresh upload", async () => {
    const result = await useCase.execute({
      organizationId: "org-1",
      createdByUserId: "user-1",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    expect(result).toEqual({ assetId: "asset-1", trustRecordId: "trust-record-1", duplicate: false });
  });

  it("same-org dedup: returns the existing DTR reference and does not store or create anything new (RF-012)", async () => {
    repository = buildRepository({
      findBySha256: vi.fn().mockResolvedValue({
        asset: new DigitalAsset(
          "existing-asset",
          REFERENCE_SHA256,
          "application/pdf",
          PDF_BYTES.byteLength,
          "contract.pdf",
          "org-1/existing",
          AssetStatus.READY,
          "org-1",
          "user-1",
          new Date(),
        ),
        trustRecordId: "existing-trust-record",
      }),
    });
    useCase = new UploadAssetUseCase(repository, storage, encryption);

    const result = await useCase.execute({
      organizationId: "org-1",
      createdByUserId: "user-1",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    expect(result).toEqual({
      assetId: "existing-asset",
      trustRecordId: "existing-trust-record",
      duplicate: true,
    });
    expect(encryption.encrypt).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(repository.createWithDraftRecord).not.toHaveBeenCalled();
  });

  it("cross-org same-hash independence: dedup lookup is scoped per organizationId (RF-012)", async () => {
    const findBySha256 = vi.fn().mockResolvedValue(null);
    repository = buildRepository({ findBySha256 });
    useCase = new UploadAssetUseCase(repository, storage, encryption);

    await useCase.execute({
      organizationId: "org-b",
      createdByUserId: "user-2",
      buffer: PDF_BYTES,
      mimeType: "application/pdf",
      filename: "contract.pdf",
    });

    expect(findBySha256).toHaveBeenCalledWith("org-b", REFERENCE_SHA256);
    expect(repository.createWithDraftRecord).toHaveBeenCalledTimes(1);
    const createArgs = (repository.createWithDraftRecord as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(createArgs.organizationId).toBe("org-b");
  });
});
