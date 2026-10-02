import { describe, expect, it } from "vitest";
import { JWT_SECRET_PLACEHOLDER, requireJwtSecret } from "./jwt-secret";

function configWith(value: string | undefined) {
  return { get: () => value } as never;
}

describe("requireJwtSecret", () => {
  it("returns the configured secret", () => {
    expect(requireJwtSecret(configWith("a-real-secret"))).toBe("a-real-secret");
  });

  it("throws when JWT_SECRET is missing", () => {
    expect(() => requireJwtSecret(configWith(undefined))).toThrow(/JWT_SECRET/);
  });

  it("throws when JWT_SECRET is blank", () => {
    expect(() => requireJwtSecret(configWith("   "))).toThrow(/JWT_SECRET/);
  });

  it("throws when JWT_SECRET is the published placeholder", () => {
    expect(() => requireJwtSecret(configWith(JWT_SECRET_PLACEHOLDER))).toThrow(/JWT_SECRET/);
  });
});
