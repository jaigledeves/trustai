import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("middleware (spec: Guarded Route Session Enforcement — /dtrs/*)", () => {
  it("redirects an unauthenticated request for a guarded route to /login", () => {
    const request = new NextRequest("http://localhost:3000/dtrs");

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets an authenticated request through without a redirect", () => {
    const request = new NextRequest("http://localhost:3000/dtrs", {
      headers: { cookie: "trustai_session=some-jwt" },
    });

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not check whether the cookie value is a valid JWT — presence only (actual validity is enforced per-call by the API)", () => {
    const request = new NextRequest("http://localhost:3000/dtrs/abc-123", {
      headers: { cookie: "trustai_session=not-a-real-jwt-at-all" },
    });

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });
});
