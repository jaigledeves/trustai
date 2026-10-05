import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  get: vi.fn(() => undefined),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const { POST } = await import("./route");

function logoutRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost:3001/api/auth/logout", { method: "POST", headers });
}

describe("POST /api/auth/logout", () => {
  it("clears the session for a same-origin request", async () => {
    mockCookieStore.set.mockClear();
    mockCookieStore.delete.mockClear();

    const response = await POST(logoutRequest({ origin: "http://localhost:3001" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(
      mockCookieStore.set.mock.calls.length + mockCookieStore.delete.mock.calls.length,
    ).toBeGreaterThan(0);
  });

  it("rejects a cross-origin logout with 403 and leaves the session untouched", async () => {
    mockCookieStore.set.mockClear();
    mockCookieStore.delete.mockClear();

    const response = await POST(logoutRequest({ origin: "https://evil.example.com" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: 403, message: expect.any(String) });
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockCookieStore.delete).not.toHaveBeenCalled();
  });

  it("rejects a logout with no Origin and no Sec-Fetch-Site", async () => {
    const response = await POST(logoutRequest({}));

    expect(response.status).toBe(403);
  });
});
