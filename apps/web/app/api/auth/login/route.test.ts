import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../../test/msw/server";

const mockCookieStore = {
  get: vi.fn(() => undefined),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const { POST } = await import("./route");

const SAME_ORIGIN = "http://localhost:3001";

function loginRequest(email: string, password: string) {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: SAME_ORIGIN },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/auth/login (spec: Login and Session Establishment)", () => {
  it("sets the httpOnly session cookie and returns ok on successful login", async () => {
    mockCookieStore.set.mockClear();
    server.use(
      http.post("http://localhost:3000/auth/login", () =>
        HttpResponse.json({ accessToken: "jwt-abc" }),
      ),
    );

    const response = await POST(loginRequest("user@example.com", "correcthorse1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "trustai_session",
      "jwt-abc",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("returns the generic no-enumeration message on 401 and never sets a cookie", async () => {
    mockCookieStore.set.mockClear();
    server.use(
      http.post("http://localhost:3000/auth/login", () =>
        HttpResponse.json({ message: "Invalid email or password" }, { status: 401 }),
      ),
    );

    const response = await POST(loginRequest("user@example.com", "wrong"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe("Email o contraseña incorrectos.");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("returns a 400 (never a 500) when the request body is malformed / not JSON", async () => {
    mockCookieStore.set.mockClear();

    const request = new NextRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: SAME_ORIGIN },
      body: "this-is-not-json{",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ status: 400, message: "email and password are required" });
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  // `JSON.parse` accepts `null`, primitives and arrays WITHOUT throwing, so the
  // parse try/catch never fires for them — the route must still guard before
  // destructuring, otherwise `const { email } = null` throws a 500.
  it.each([
    ["null", "null"],
    ["a JSON number primitive", "42"],
    ["a JSON string primitive", '"just-a-string"'],
    ["a JSON array", "[]"],
  ])(
    "returns a 400 (never a 500) when the JSON body is %s",
    async (_label, rawBody) => {
      mockCookieStore.set.mockClear();

      const request = new NextRequest("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: SAME_ORIGIN },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ status: 400, message: "email and password are required" });
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    },
  );

  it("returns the distinct unverified-email message on 403 and never sets a cookie", async () => {
    mockCookieStore.set.mockClear();
    server.use(
      http.post("http://localhost:3000/auth/login", () =>
        HttpResponse.json({ message: "Email address is not verified" }, { status: 403 }),
      ),
    );

    const response = await POST(loginRequest("user@example.com", "correcthorse1"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("Verifica tu email antes de iniciar sesión.");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  describe("login CSRF guard (no cross-site login into an attacker's account)", () => {
    function rawLogin(headers: Record<string, string>, body = '{"email":"attacker@example.com","password":"attackerpass1"}') {
      return new NextRequest("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers,
        body,
      });
    }

    async function expectRejected(request: NextRequest) {
      mockCookieStore.set.mockClear();
      let backendCalled = false;
      server.use(
        http.post("http://localhost:3000/auth/login", () => {
          backendCalled = true;
          return HttpResponse.json({ accessToken: "attacker-jwt" });
        }),
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ status: 403, message: expect.any(String) });
      expect(backendCalled).toBe(false);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    }

    it("rejects a cross-origin JSON POST", async () => {
      await expectRejected(
        rawLogin({ "content-type": "application/json", origin: "https://evil.example.com" }),
      );
    });

    it("rejects a text/plain POST even from the same origin (<form enctype=text/plain> body)", async () => {
      await expectRejected(rawLogin({ "content-type": "text/plain", origin: SAME_ORIGIN }));
    });

    it("rejects a cross-site <form enctype=text/plain> POST", async () => {
      await expectRejected(
        rawLogin({ "content-type": "text/plain", origin: "https://evil.example.com" }),
      );
    });

    it("rejects a POST with no Origin and no Sec-Fetch-Site", async () => {
      await expectRejected(rawLogin({ "content-type": "application/json" }));
    });

    it("accepts a same-origin JSON POST identified only by Sec-Fetch-Site", async () => {
      mockCookieStore.set.mockClear();
      server.use(
        http.post("http://localhost:3000/auth/login", () =>
          HttpResponse.json({ accessToken: "jwt-abc" }),
        ),
      );

      const response = await POST(
        rawLogin({ "content-type": "application/json; charset=utf-8", "sec-fetch-site": "same-origin" }),
      );

      expect(response.status).toBe(200);
      expect(mockCookieStore.set).toHaveBeenCalled();
    });
  });
});
