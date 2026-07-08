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

function loginRequest(email: string, password: string) {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    expect(body.message).toBe("Verificá tu email antes de iniciar sesión.");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });
});
