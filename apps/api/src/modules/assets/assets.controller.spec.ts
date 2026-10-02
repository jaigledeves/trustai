import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { UploadAssetUseCase } from "../../application/certification/upload-asset.use-case";
import type { DigitalAssetRepositoryPort } from "../../ports/digital-asset-repository.port";
import { AssetsController } from "./assets.controller";

const user = { sub: "user-1", organizationId: "org-1", email: "a@b.c" } as never;

function buildController() {
  const execute = vi.fn(async () => ({ duplicate: false, assetId: "a-1", trustRecordId: "tr-1" }));
  const controller = new AssetsController(
    { execute } as unknown as UploadAssetUseCase,
    {} as DigitalAssetRepositoryPort,
  );
  return { controller, execute };
}

function buildFile(buffer: Buffer, mimetype = "application/pdf"): Express.Multer.File {
  return { buffer, mimetype, originalname: "doc.pdf", size: buffer.length } as Express.Multer.File;
}

describe("AssetsController.upload", () => {
  it("rejects a file declared as application/pdf whose bytes are not a PDF", async () => {
    const { controller, execute } = buildController();

    await expect(
      controller.upload(buildFile(Buffer.from("<html>not a pdf</html>")), { user }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a non-PDF MIME type even when the bytes look like a PDF", async () => {
    const { controller, execute } = buildController();

    await expect(
      controller.upload(buildFile(Buffer.from("%PDF-1.7"), "text/plain"), { user }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it("accepts a real PDF and persists the server-verified MIME type", async () => {
    const { controller, execute } = buildController();

    await controller.upload(buildFile(Buffer.from("%PDF-1.7\n")), { user });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "application/pdf", organizationId: "org-1" }),
    );
  });
});
