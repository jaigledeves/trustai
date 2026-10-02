import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClientIp } from "./client-ip";

const req = (headers: Record<string, unknown>, ip: unknown = "10.0.0.1") => ({ ip, headers });

describe("resolveClientIp", () => {
  beforeEach(() => vi.stubEnv("TRUSTED_PROXY_SECRET", "s3cret"));
  afterEach(() => vi.unstubAllEnvs());

  it("trusts the forwarded IP when the proxy secret matches", () => {
    expect(resolveClientIp(req({ "x-proxy-secret": "s3cret", "x-client-ip": " 1.2.3.4 " }))).toBe("1.2.3.4");
  });

  it("falls back to req.ip when the secret is wrong", () => {
    expect(resolveClientIp(req({ "x-proxy-secret": "nope", "x-client-ip": "1.2.3.4" }))).toBe("10.0.0.1");
  });

  it("ignores forwarded headers when no secret is configured", () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", undefined);
    expect(resolveClientIp(req({ "x-proxy-secret": "s3cret", "x-client-ip": "1.2.3.4" }))).toBe("10.0.0.1");
  });

  it("falls back to req.ip when x-client-ip is missing", () => {
    expect(resolveClientIp(req({ "x-proxy-secret": "s3cret" }))).toBe("10.0.0.1");
  });

  it("ignores array-valued headers", () => {
    expect(resolveClientIp(req({ "x-proxy-secret": ["s3cret"], "x-client-ip": ["1.2.3.4"] }))).toBe("10.0.0.1");
  });

  it("returns undefined when there is no usable req.ip", () => {
    expect(resolveClientIp({ headers: {} })).toBeUndefined();
  });
});
