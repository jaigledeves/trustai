import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "./errors";
import {
  getProofPackage,
  getVerifyHash,
  NotFoundError,
  postVerifyUpload,
  proofPackageDownloadUrl,
} from "./public-verify-client";

const BASE_URL = "http://localhost:3000";

function verifyHashBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    verdict: "VALID",
    documentIntegrity: true,
    chainAnchor: {
      anchored: true,
      txHash: "0xabc",
      blockTimestamp: "2026-07-09T00:00:00.000Z",
      explorerUrl: "https://sepolia.basescan.org/tx/0xabc",
      chainReadUnavailable: false,
    },
    explanation: "This document's content matches the certified Trust Record.",
    disclaimer: "This verification does not constitute a qualified electronic signature.",
    verifiedAt: "2026-07-09T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * spec: "Upload Verdict, All Four States" — "INVALID_RECORD via POST on
 * unknown id ... the UI MUST NOT expect a 404 here (asymmetry vs. GET)".
 * This is the highest-risk logic in this slice (design.md), so it gets
 * its own dedicated test independent of any component.
 */
describe("public-verify-client (spec: GET/POST existence asymmetry, no-auth)", () => {
  it("getVerifyHash throws NotFoundError when GET /public/verify/:id 404s for an unknown id", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/unknown-id`, () =>
        HttpResponse.json({ message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(getVerifyHash("unknown-id")).rejects.toThrow(NotFoundError);
  });

  it("getVerifyHash resolves the verdict body for a known id (200)", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/rec-1`, () => HttpResponse.json(verifyHashBody())),
    );

    const result = await getVerifyHash("rec-1");

    expect(result.verdict).toBe("VALID");
    expect(result.chainAnchor?.txHash).toBe("0xabc");
  });

  it("postVerifyUpload NEVER throws for an unknown id — it resolves 200 with verdict INVALID_RECORD instead of 404ing", async () => {
    server.use(
      http.post(`${BASE_URL}/public/verify/unknown-id`, () =>
        HttpResponse.json(verifyHashBody({ verdict: "INVALID_RECORD", documentIntegrity: false, chainAnchor: null, analysis: null })),
      ),
    );

    const result = await postVerifyUpload("unknown-id", new File(["pdf bytes"], "doc.pdf"));

    expect(result.verdict).toBe("INVALID_RECORD");
  });

  it("postVerifyUpload rejects with an ApiError carrying the HTTP status (e.g. 413 for an oversized file)", async () => {
    server.use(
      http.post(`${BASE_URL}/public/verify/rec-1`, () =>
        HttpResponse.json({ message: "File too large" }, { status: 413 }),
      ),
    );

    const error = await postVerifyUpload("rec-1", new File(["x"], "big.pdf")).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(413);
  });

  it("postVerifyUpload sends the file as multipart form data (not JSON) to POST /public/verify/:id", async () => {
    let receivedContentType: string | null = null;
    server.use(
      http.post(`${BASE_URL}/public/verify/rec-1`, ({ request }) => {
        receivedContentType = request.headers.get("content-type");
        return HttpResponse.json(verifyHashBody({ analysis: null }));
      }),
    );

    await postVerifyUpload("rec-1", new File(["pdf bytes"], "sample.pdf"));

    expect(receivedContentType).toContain("multipart/form-data");
  });
});

describe("getProofPackage (ADR-016: GET /public/verify/:id/proof)", () => {
  it("returns the raw body on 200 without validating it (the caller parses it with dtr-core)", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/rec-1/proof`, () =>
        HttpResponse.json({ format: "ancrux-proof-1" }),
      ),
    );

    await expect(getProofPackage("rec-1")).resolves.toEqual({
      status: "ok",
      body: { format: "ancrux-proof-1" },
    });
  });

  it("maps 404 to not_found", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/unknown/proof`, () =>
        HttpResponse.json({ message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(getProofPackage("unknown")).resolves.toEqual({ status: "not_found" });
  });

  it("maps the dtr-1 409 to legacy", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/old/proof`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message:
              "This is a legacy (dtr-1) record: it is verified by the server only and has no public proof package",
            error: "Conflict",
          },
          { status: 409 },
        ),
      ),
    );

    await expect(getProofPackage("old")).resolves.toEqual({ status: "legacy" });
  });

  it("maps any other 409 to unavailable", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/pending/proof`, () =>
        HttpResponse.json(
          { statusCode: 409, message: "This record is not yet anchored, so it has no proof package" },
          { status: 409 },
        ),
      ),
    );

    await expect(getProofPackage("pending")).resolves.toEqual({ status: "unavailable" });
  });

  it("throws an ApiError on any other non-2xx", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/rec-1/proof`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const error = await getProofPackage("rec-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it("builds the download URL with download=1", () => {
    expect(proofPackageDownloadUrl("rec 1")).toBe(
      `${BASE_URL}/public/verify/rec%201/proof?download=1`,
    );
  });
});
