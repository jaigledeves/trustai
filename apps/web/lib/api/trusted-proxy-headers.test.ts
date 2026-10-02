import { afterEach, describe, expect, it, vi } from "vitest";
import { trustedProxyHeaders } from "./trusted-proxy-headers";

function requestWith(forwardedFor?: string): Request {
  const headers = new Headers();
  if (forwardedFor !== undefined) headers.set("x-forwarded-for", forwardedFor);
  return new Request("https://ancrux.vercel.app/api/auth/login", { headers });
}

describe("trustedProxyHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards the first x-forwarded-for entry with the shared secret", () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", "s3cret");
    expect(trustedProxyHeaders(requestWith(" 203.0.113.7 , 10.0.0.1"))).toStrictEqual({
      "x-proxy-secret": "s3cret",
      "x-client-ip": "203.0.113.7",
    });
  });

  it("returns no headers when the secret is not configured", () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", "");
    expect(trustedProxyHeaders(requestWith("203.0.113.7"))).toStrictEqual({});
  });

  it("returns no headers when the request carries no client IP", () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", "s3cret");
    expect(trustedProxyHeaders(requestWith())).toStrictEqual({});
  });
});
