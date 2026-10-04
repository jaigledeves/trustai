import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { ProofPackageV1 } from "@trustai/dtr-core";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type {
  GetProofPackageUseCase,
  ProofPackageResult,
} from "../../application/verification/get-proof-package.use-case";
import type { VerifyDocumentUseCase } from "../../application/verification/verify-document.use-case";
import { PublicVerificationController } from "./public-verification.controller";

const PROOF: ProofPackageV1 = {
  format: "ancrux-proof-1",
  trustRecordId: "trust-record-1",
  dtr: {
    schemaVersion: "dtr-2",
    issuedAt: "2026-10-04T12:00:00.000Z",
    coreHash: "a".repeat(64),
    enrichmentHash: "b".repeat(64),
    anchorHash: "c".repeat(64),
  },
  algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
  anchor: {
    chainId: 84532,
    network: "base-sepolia",
    contractAddress: "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22",
    txHash: `0x${"d".repeat(64)}`,
    blockNumber: "18734512",
    blockTimestamp: "2026-10-04T12:00:14.000Z",
  },
};

function controllerReturning(result: ProofPackageResult) {
  const getProofPackage = { execute: vi.fn(async () => result) };
  const controller = new PublicVerificationController(
    {} as VerifyDocumentUseCase,
    {} as ConfigService,
    getProofPackage as unknown as GetProofPackageUseCase,
  );
  const res = { setHeader: vi.fn() };
  return { controller, getProofPackage, res, response: res as unknown as Response };
}

describe("PublicVerificationController GET /public/verify/:id/proof", () => {
  it("returns the package as plain JSON without a download header by default", async () => {
    const { controller, getProofPackage, res, response } = controllerReturning({ status: "ok", proof: PROOF });

    await expect(controller.getProofPackage("trust-record-1", undefined, response)).resolves.toEqual(PROOF);
    expect(getProofPackage.execute).toHaveBeenCalledWith("trust-record-1");
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("sets an attachment Content-Disposition when download=1", async () => {
    const { controller, res, response } = controllerReturning({ status: "ok", proof: PROOF });

    await controller.getProofPackage("trust-record-1", "1", response);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="ancrux-proof-trust-record-1.json"',
    );
  });

  it("maps an unknown id to 404", async () => {
    const { controller, response } = controllerReturning({ status: "not_found" });

    await expect(controller.getProofPackage("missing", undefined, response)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each<[ProofPackageResult["status"], RegExp]>([
    ["legacy_record", /legacy.*server/i],
    ["not_anchored", /not yet anchored/i],
    ["unavailable", /cannot be produced/i],
  ])("maps %s to 409 with a clear message", async (status, message) => {
    const { controller, res, response } = controllerReturning({ status } as ProofPackageResult);

    const error = await controller.getProofPackage("trust-record-1", "1", response).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toMatch(message);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
