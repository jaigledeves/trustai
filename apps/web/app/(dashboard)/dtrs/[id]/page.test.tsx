import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../../test/msw/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "token" }) })),
}));

const { default: DtrDetailPage } = await import("./page");

describe("DtrDetailPage (spec: web-history — DTR Detail View, cross-org 404)", () => {
  it("renders notFound() for a cross-org or unknown id, never a 403-style message (RNF-004)", async () => {
    server.use(
      http.get("http://localhost:3000/trust-records/other-org-id", () =>
        HttpResponse.json({ message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(
      DtrDetailPage({
        params: Promise.resolve({ id: "other-org-id" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
});
