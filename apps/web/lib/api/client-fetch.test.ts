import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "./errors";
import { clientFetch } from "./client-fetch";

describe("clientFetch (browser fetch wrapper targeting the /api/backend proxy)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });


  it("GET requests target /api/backend/{path} and resolve the JSON body", async () => {
    server.use(
      http.get("http://localhost:3000/api/backend/trust-records/1", () =>
        HttpResponse.json({ id: "1", state: "DRAFT" }),
      ),
    );

    const result = await clientFetch<{ id: string; state: string }>(
      "/trust-records/1",
    );

    expect(result).toEqual({ id: "1", state: "DRAFT" });
  });

  it("sends a JSON body and content-type header for a mutating call", async () => {
    let receivedBody: unknown = null;
    let receivedContentType: string | null = null;
    server.use(
      http.patch(
        "http://localhost:3000/api/backend/trust-records/1/review",
        async ({ request }) => {
          receivedBody = await request.json();
          receivedContentType = request.headers.get("content-type");
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const result = await clientFetch("/trust-records/1/review", {
      method: "PATCH",
      body: { summary: "edited" },
    });

    expect(receivedBody).toEqual({ summary: "edited" });
    expect(receivedContentType).toContain("application/json");
    expect(result).toBeUndefined();
  });

  it("sends a FormData body as-is, without setting a manual content-type header (the browser must set the multipart boundary itself)", async () => {
    // msw's Node request interceptor hangs when reading a jsdom-global
    // File's stream via request.formData() (a known jsdom/undici Blob
    // interop gap) — spying on fetch directly avoids the real body
    // round-trip while still proving the exact behavioral contract this
    // wrapper must uphold: no content-type header set for FormData bodies.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ assetId: "a1", trustRecordId: "tr1", duplicate: false }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );

    const formData = new FormData();
    formData.set("file", new File(["pdf-bytes"], "doc.pdf", { type: "application/pdf" }));

    const result = await clientFetch<{ assetId: string }>("/assets", {
      method: "POST",
      formData,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    expect(init?.body).toBe(formData);
    expect((init?.headers as Record<string, string>)["content-type"]).toBeUndefined();
    expect(result).toEqual({ assetId: "a1", trustRecordId: "tr1", duplicate: false });
  });

  it("throws an ApiError using the proxy's normalized {status, message} shape on a non-2xx response", async () => {
    server.use(
      http.get("http://localhost:3000/api/backend/trust-records/missing", () =>
        HttpResponse.json({ status: 404, message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(clientFetch("/trust-records/missing")).rejects.toMatchObject(
      new ApiError(404, "Trust record not found"),
    );
  });
});
