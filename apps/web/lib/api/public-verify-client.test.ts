import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { getVerifyHash, NotFoundError, postVerifyUpload } from "./public-verify-client";

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
