import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import {
  ACCOUNT_THROTTLE_KEY,
  DEFAULT_AUTH_THROTTLE_LIMIT,
  MAX_EMAIL_TRACKER_LENGTH,
  accountTracker,
  isAccountThrottled,
  resolveAuthThrottleLimit,
} from "./auth-throttle";
import { AuthController } from "./auth.controller";

// Mirrors @nestjs/throttler's THROTTLER_TRACKER constant + the "global" throttler name.
const THROTTLER_TRACKER_GLOBAL = "THROTTLER:TRACKERglobal";

function contextFor(handler: (...args: never[]) => unknown): ExecutionContext {
  return { getHandler: () => handler } as unknown as ExecutionContext;
}

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

  it("falls back to the IP when the email is blank", () => {
    expect(accountTracker({ body: { email: "   " }, ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });

  it("falls back to the IP when the email exceeds the maximum length", () => {
    const email = `${"a".repeat(MAX_EMAIL_TRACKER_LENGTH)}@b.c`;
    expect(accountTracker({ body: { email }, ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });

  it("accepts an email of exactly the maximum length", () => {
    const email = `${"a".repeat(MAX_EMAIL_TRACKER_LENGTH - 4)}@b.c`;
    expect(accountTracker({ body: { email }, ip: "1.2.3.4" })).toBe(`account:${email}`);
  });

  it("uses a fixed key when the request has no IP", () => {
    expect(accountTracker({ body: {} })).toBe("ip:unknown");
    expect(accountTracker({ body: {}, ip: "" })).toBe("ip:unknown");
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

  it.each(["", "   ", "abc", "0", "-3", "2.5"])("defaults when AUTH_THROTTLE_LIMIT is %j", (value) => {
    process.env["AUTH_THROTTLE_LIMIT"] = value;
    expect(resolveAuthThrottleLimit()).toBe(DEFAULT_AUTH_THROTTLE_LIMIT);
  });

  it("reads AUTH_THROTTLE_LIMIT at call time", () => {
    process.env["AUTH_THROTTLE_LIMIT"] = "42";
    expect(resolveAuthThrottleLimit()).toBe(42);
  });
});

describe("AuthController per-account throttle", () => {
  it.each(["login", "forgotPassword", "register"] as const)("%s is marked for the account throttler", (method) => {
    const handler = AuthController.prototype[method];
    expect(Reflect.getMetadata(ACCOUNT_THROTTLE_KEY, handler)).toBe(true);
    expect(isAccountThrottled(contextFor(handler))).toBe(true);
  });

  it.each(["login", "forgotPassword", "register"] as const)(
    "%s keeps the global per-IP tracker (no global tracker override)",
    (method) => {
      const handler = AuthController.prototype[method];
      expect(Reflect.getMetadata(THROTTLER_TRACKER_GLOBAL, handler)).toBeUndefined();
    },
  );

  it.each(["resetPassword"] as const)("%s is not marked for the account throttler", (method) => {
    const handler = AuthController.prototype[method];
    expect(Reflect.getMetadata(ACCOUNT_THROTTLE_KEY, handler)).toBeUndefined();
    expect(isAccountThrottled(contextFor(handler))).toBe(false);
  });
});
