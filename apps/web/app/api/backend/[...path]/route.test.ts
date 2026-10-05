import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../../test/msw/server";

const mockCookieStore = {
  get: () => ({ value: "server-side-jwt" }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// Imported AFTER the mock so the route module's `getSession()` call
// resolves the mocked `next/headers`.
const { GET, POST, PATCH, PUT, DELETE } = await import("./route");

const SAME_ORIGIN = "http://localhost:3001";

function context(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe("app/api/backend/[...path] proxy (spec: Proxy call attaches Bearer header)", () => {
  it("GET forwards to API_BASE_URL/{path} with Authorization: Bearer <token>, never the raw cookie", async () => {
    let receivedAuth: string | null = null;
    let receivedCookie: string | null = null;

    server.use(
      http.get("http://localhost:3000/trust-records/1", ({ request }) => {
        receivedAuth = request.headers.get("authorization");
        receivedCookie = request.headers.get("cookie");
        return HttpResponse.json({ id: "1", state: "DRAFT" });
      }),
    );

    const request = new NextRequest(
      "http://localhost:3001/api/backend/trust-records/1",
    );
    const response = await GET(request, context(["trust-records", "1"]));
    const body = await response.json();

    expect(receivedAuth).toBe("Bearer server-side-jwt");
    expect(receivedCookie).toBeNull();
    expect(response.status).toBe(200);
    expect(body).toEqual({ id: "1", state: "DRAFT" });
  });

  it("POST forwards the method, body, and query string", async () => {
    let receivedMethod = "";
    let receivedBody: unknown = null;
    let receivedQuery: string | null = null;

    server.use(
      http.post("http://localhost:3000/assets", async ({ request }) => {
        receivedMethod = request.method;
        receivedBody = await request.json();
        receivedQuery = new URL(request.url).searchParams.get("page");
        return HttpResponse.json({ assetId: "a1" }, { status: 201 });
      }),
    );

    const request = new NextRequest(
      "http://localhost:3001/api/backend/assets?page=2",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: SAME_ORIGIN },
        body: JSON.stringify({ filename: "doc.pdf" }),
      },
    );
    const response = await POST(request, context(["assets"]));
    const body = await response.json();

    expect(receivedMethod).toBe("POST");
    expect(receivedBody).toEqual({ filename: "doc.pdf" });
    expect(receivedQuery).toBe("2");
    expect(response.status).toBe(201);
    expect(body).toEqual({ assetId: "a1" });
  });

  it("PATCH forwards a JSON body and passes through a 204 with no body", async () => {
    let receivedBody: unknown = null;

    server.use(
      http.patch(
        "http://localhost:3000/trust-records/1/review",
        async ({ request }) => {
          receivedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const request = new NextRequest(
      "http://localhost:3001/api/backend/trust-records/1/review",
      {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: SAME_ORIGIN },
        body: JSON.stringify({ summary: "edited" }),
      },
    );
    const response = await PATCH(
      request,
      context(["trust-records", "1", "review"]),
    );

    expect(receivedBody).toEqual({ summary: "edited" });
    expect(response.status).toBe(204);
  });

  it("rejects (400) a path whose leading empty segment would resolve to a foreign origin — never attaches the Bearer to it (SSRF guard)", async () => {
    let leaked = false;
    server.use(
      http.get("http://evil.example.com/steal", () => {
        leaked = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    // A leading empty catch-all segment => `//evil.example.com/steal`, which
    // `new URL()` resolves to http://evil.example.com — a different origin.
    const request = new NextRequest("http://localhost:3001/api/backend//evil.example.com/steal");
    const response = await GET(request, context(["", "evil.example.com", "steal"]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ status: 400, message: "Invalid request path" });
    // The forwarded request must never have reached the foreign host.
    expect(leaked).toBe(false);
  });

  it("maps a backend network failure to a 502 {status, message} shape (no uncaught TypeError -> 500 crash)", async () => {
    server.use(
      http.get("http://localhost:3000/trust-records/down", () => HttpResponse.error()),
    );

    const request = new NextRequest("http://localhost:3001/api/backend/trust-records/down");
    const response = await GET(request, context(["trust-records", "down"]));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      status: 502,
      message: "Could not reach the backend service",
    });
  });

  it("normalizes a 401 from the backend into a client-consumable {status, message} shape", async () => {
    server.use(
      http.get("http://localhost:3000/trust-records/2", () =>
        HttpResponse.json(
          { statusCode: 401, message: "Unauthorized", error: "Unauthorized" },
          { status: 401 },
        ),
      ),
    );

    const request = new NextRequest(
      "http://localhost:3001/api/backend/trust-records/2",
    );
    const response = await GET(request, context(["trust-records", "2"]));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ status: 401, message: "Unauthorized" });
  });

  describe("CSRF guard on write methods (SameSite=Lax alone is not the control)", () => {
    const writeMethods = [
      ["POST", POST],
      ["PATCH", PATCH],
      ["PUT", PUT],
      ["DELETE", DELETE],
    ] as const;

    it.each(writeMethods)(
      "rejects a cross-origin %s with 403 and never reaches the backend",
      async (method, handler) => {
        let backendCalled = false;
        server.use(
          http.all("http://localhost:3000/trust-records/1", () => {
            backendCalled = true;
            return HttpResponse.json({ ok: true });
          }),
        );

        const request = new NextRequest("http://localhost:3001/api/backend/trust-records/1", {
          method,
          headers: { "content-type": "application/json", origin: "https://evil.example.com" },
          ...(method === "DELETE" ? {} : { body: JSON.stringify({ summary: "x" }) }),
        });
        const response = await handler(request, context(["trust-records", "1"]));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toEqual({ status: 403, message: expect.any(String) });
        expect(backendCalled).toBe(false);
      },
    );

    it("rejects a write with no Origin and no Sec-Fetch-Site", async () => {
      const request = new NextRequest("http://localhost:3001/api/backend/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const response = await POST(request, context(["assets"]));

      expect(response.status).toBe(403);
    });

    it("still forwards a same-origin multipart upload (Content-Type is not the control here)", async () => {
      let receivedContentType: string | null = null;
      server.use(
        http.post("http://localhost:3000/assets", ({ request }) => {
          receivedContentType = request.headers.get("content-type");
          return HttpResponse.json({ assetId: "a1" }, { status: 201 });
        }),
      );

      const boundary = "----trustai-test-boundary";
      const multipartBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="doc.pdf"',
        "Content-Type: application/pdf",
        "",
        "%PDF-1.4",
        `--${boundary}--`,
        "",
      ].join("\r\n");
      const request = new NextRequest("http://localhost:3001/api/backend/assets", {
        method: "POST",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          origin: SAME_ORIGIN,
        },
        body: multipartBody,
      });
      const response = await POST(request, context(["assets"]));

      expect(response.status).toBe(201);
      expect(receivedContentType).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("does not require an Origin on GET (cross-origin reads are not CSRF)", async () => {
      server.use(
        http.get("http://localhost:3000/trust-records/9", () => HttpResponse.json({ id: "9" })),
      );

      const request = new NextRequest("http://localhost:3001/api/backend/trust-records/9", {
        headers: { origin: "https://evil.example.com" },
      });
      const response = await GET(request, context(["trust-records", "9"]));

      expect(response.status).toBe(200);
    });
  });
});
