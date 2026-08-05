import { describe, expect, it } from "vitest";
import { User, UserRole } from "./user.entity";

describe("User.hasValidPasswordResetToken", () => {
  it("returns true for a matching, unexpired token hash", () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      "token-hash",
      new Date(Date.now() + 60_000),
    );

    expect(user.hasValidPasswordResetToken("token-hash")).toBe(true);
  });

  it("returns false for an expired token hash", () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      "token-hash",
      new Date(Date.now() - 60_000),
    );

    expect(user.hasValidPasswordResetToken("token-hash")).toBe(false);
  });

  it("returns false for a non-matching token hash", () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      "token-hash",
      new Date(Date.now() + 60_000),
    );

    expect(user.hasValidPasswordResetToken("other-hash")).toBe(false);
  });

  it("returns false when no reset token is set", () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
    );

    expect(user.hasValidPasswordResetToken("any-hash")).toBe(false);
  });
});
