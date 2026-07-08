import { describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// Imported AFTER the mock so `next/headers` resolves to the mock above.
const { buildSessionCookieOptions, getSession, setSessionCookie, clearSessionCookie } =
  await import("./session");

describe("buildSessionCookieOptions (pure — spec: JWT Never Exposed to Client JavaScript)", () => {
  it("is httpOnly with a 7-day (604800s) maxAge matching JWT_EXPIRES_IN=7d", () => {
    const options = buildSessionCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.maxAge).toBe(604_800);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("is only marked secure in production (dev over http must still work)", () => {
    const original = process.env["NODE_ENV"];

    process.env["NODE_ENV"] = "production";
    expect(buildSessionCookieOptions().secure).toBe(true);

    process.env["NODE_ENV"] = "development";
    expect(buildSessionCookieOptions().secure).toBe(false);

    process.env["NODE_ENV"] = original;
  });
});

describe("session cookie plumbing", () => {
  it("setSessionCookie writes the access token under the configured cookie name with httpOnly options", async () => {
    mockCookieStore.set.mockClear();

    await setSessionCookie("token-abc");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "trustai_session",
      "token-abc",
      expect.objectContaining({ httpOnly: true, maxAge: 604_800 }),
    );
  });

  it("getSession reads the token from the configured cookie name", async () => {
    mockCookieStore.get.mockReturnValue({ value: "stored-token" });

    const session = await getSession();

    expect(mockCookieStore.get).toHaveBeenCalledWith("trustai_session");
    expect(session).toBe("stored-token");
  });

  it("getSession returns undefined when the cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeUndefined();
  });

  it("clearSessionCookie expires the cookie immediately (maxAge 0)", async () => {
    mockCookieStore.set.mockClear();

    await clearSessionCookie();

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "trustai_session",
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });
});
