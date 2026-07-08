import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";

const mockCookieStore = {
  get: () => ({ value: "server-side-jwt" }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// Imported AFTER the mock so `lib/session.ts` (which server-client.ts
// depends on) resolves the mocked `next/headers`.
const { serverFetch } = await import("./server-client");
const { ApiError } = await import("./errors");

describe("serverFetch (spec: Proxy call attaches Bearer header — same principle for direct server-client calls)", () => {
  it("attaches Authorization: Bearer <token> from the session cookie, never the raw cookie", async () => {
    let receivedAuthHeader: string | null = null;

    server.use(
      http.get("http://localhost:3000/trust-records/1", ({ request }) => {
        receivedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({ id: "1", state: "DRAFT" });
      }),
    );

    const result = await serverFetch<{ id: string; state: string }>(
      "/trust-records/1",
    );

    expect(receivedAuthHeader).toBe("Bearer server-side-jwt");
    expect(result).toEqual({ id: "1", state: "DRAFT" });
  });

  it("forwards the method and JSON body for a mutating call", async () => {
    let receivedMethod = "";
    let receivedBody: unknown = null;

    server.use(
      http.post(
        "http://localhost:3000/trust-records/1/review",
        async ({ request }) => {
          receivedMethod = request.method;
          receivedBody = await request.json();
          return HttpResponse.json({}, { status: 204 });
        },
      ),
    );

    await serverFetch("/trust-records/1/review", {
      method: "POST",
      body: { summary: "updated" },
    });

    expect(receivedMethod).toBe("POST");
    expect(receivedBody).toEqual({ summary: "updated" });
  });

  it("throws an ApiError carrying the response status and message on a non-2xx response", async () => {
    server.use(
      http.get("http://localhost:3000/trust-records/missing", () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
    );

    await expect(
      serverFetch("/trust-records/missing"),
    ).rejects.toMatchObject(
      new ApiError(404, "Not found"),
    );
  });
});
