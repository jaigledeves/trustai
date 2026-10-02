import "reflect-metadata";
import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_THROTTLE_TTL_MS,
  DEFAULT_AUTH_THROTTLE_LIMIT,
  accountTracker,
  resolveAuthThrottleLimit,
} from "./auth-throttle";
import { AuthController } from "./auth.controller";

const THROTTLER_LIMIT_GLOBAL = "THROTTLER:LIMITglobal";
const THROTTLER_TTL_GLOBAL = "THROTTLER:TTLglobal";
const THROTTLER_TRACKER_GLOBAL = "THROTTLER:TRACKERglobal";

describe("accountTracker", () => {
  it("keys the request by the normalized email in the body", () => {
    expect(accountTracker({ body: { email: "  Alice@Example.COM " }, ip: "1.2.3.4" })).toBe(
      "account:alice@example.com",
    );
  });

  it("falls back to the IP when the body carries no email", () => {
    expect(accountTracker({ body: {}, ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });

  it("falls back to the IP when the email is not a string", () => {
    expect(accountTracker({ body: { email: ["a@b.c"] }, ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });
});

describe("resolveAuthThrottleLimit", () => {
  const previous = process.env["AUTH_THROTTLE_LIMIT"];
  afterEach(() => {
    if (previous === undefined) delete process.env["AUTH_THROTTLE_LIMIT"];
    else process.env["AUTH_THROTTLE_LIMIT"] = previous;
  });

  it("defaults when AUTH_THROTTLE_LIMIT is unset", () => {
    delete process.env["AUTH_THROTTLE_LIMIT"];
    expect(resolveAuthThrottleLimit()).toBe(DEFAULT_AUTH_THROTTLE_LIMIT);
  });

  it("reads AUTH_THROTTLE_LIMIT at call time", () => {
    process.env["AUTH_THROTTLE_LIMIT"] = "42";
    expect(resolveAuthThrottleLimit()).toBe(42);
  });
});

describe("AuthController per-account throttle", () => {
  it.each(["login", "forgotPassword"] as const)("%s is throttled per account", (method) => {
    const handler = AuthController.prototype[method];
    expect(Reflect.getMetadata(THROTTLER_LIMIT_GLOBAL, handler)).toBe(resolveAuthThrottleLimit);
    expect(Reflect.getMetadata(THROTTLER_TTL_GLOBAL, handler)).toBe(AUTH_THROTTLE_TTL_MS);
    expect(Reflect.getMetadata(THROTTLER_TRACKER_GLOBAL, handler)).toBe(accountTracker);
  });
});
