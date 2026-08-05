import { describe, expect, it } from "vitest";
import {
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
  validateResetPasswordForm,
} from "./auth";

describe("validateRegisterForm (pure — spec: Client-side validation error)", () => {
  it("returns no errors for a valid email and a policy-compliant password", () => {
    expect(
      validateRegisterForm(
        "user@example.com",
        "correcthorse1",
        "correcthorse1",
      ),
    ).toEqual({});
  });

  it("flags an invalid email format", () => {
    const errors = validateRegisterForm(
      "not-an-email",
      "correcthorse1",
      "correcthorse1",
    );

    expect(errors.email).toBe("Ingresa un email válido.");
    expect(errors.password).toBeUndefined();
  });

  it("flags a password below the 8-char/letter+digit policy (mirrors RegisterDto's backend regex)", () => {
    const errors = validateRegisterForm(
      "user@example.com",
      "short1",
      "short1",
    );

    expect(errors.password).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("flags a password with 8+ chars but no digit", () => {
    const errors = validateRegisterForm(
      "user@example.com",
      "onlyletters",
      "onlyletters",
    );

    expect(errors.password).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("returns no mismatch error for a matching confirm-password pair (spec: Register Form Confirms Password Match)", () => {
    const errors = validateRegisterForm(
      "user@example.com",
      "correcthorse1",
      "correcthorse1",
    );

    expect(errors.confirmPassword).toBeUndefined();
  });

  it("flags a mismatch between password and confirmPassword independent of the weak-password flag", () => {
    const errors = validateRegisterForm(
      "user@example.com",
      "correcthorse1",
      "different1",
    );

    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden.");
    expect(errors.password).toBeUndefined();
  });
});

describe("validateLoginForm (pure)", () => {
  it("returns no errors for a valid email and a non-empty password", () => {
    expect(validateLoginForm("user@example.com", "anything")).toEqual({});
  });

  it("flags an invalid email format", () => {
    expect(validateLoginForm("nope", "anything").email).toBe(
      "Ingresa un email válido.",
    );
  });

  it("flags an empty password without checking any policy (login has no complexity rule)", () => {
    expect(validateLoginForm("user@example.com", "").password).toBe(
      "Ingresa tu contraseña.",
    );
  });
});

describe("validateForgotPasswordForm (pure — spec: Forgot-Password Enumeration Defense)", () => {
  it("returns no errors for a valid email", () => {
    expect(validateForgotPasswordForm("user@example.com")).toEqual({});
  });

  it("flags an invalid email format", () => {
    expect(validateForgotPasswordForm("nope").email).toBe(
      "Ingresa un email válido.",
    );
  });
});

describe("validateResetPasswordForm (pure — spec: Reset Form Confirms Password Match)", () => {
  it("returns no errors for a policy-compliant, matching password pair", () => {
    expect(
      validateResetPasswordForm("correcthorse1", "correcthorse1"),
    ).toEqual({});
  });

  it("flags a password below the 8-char/letter+digit policy (mirrors ResetPasswordDto's backend regex)", () => {
    const errors = validateResetPasswordForm("short1", "short1");

    expect(errors.newPassword).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("flags a mismatch between newPassword and confirmPassword without a network call", () => {
    const errors = validateResetPasswordForm("correcthorse1", "different1");

    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden.");
    expect(errors.newPassword).toBeUndefined();
  });
});
