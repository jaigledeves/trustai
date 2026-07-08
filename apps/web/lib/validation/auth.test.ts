import { describe, expect, it } from "vitest";
import { validateLoginForm, validateRegisterForm } from "./auth";

describe("validateRegisterForm (pure — spec: Client-side validation error)", () => {
  it("returns no errors for a valid email and a policy-compliant password", () => {
    expect(validateRegisterForm("user@example.com", "correcthorse1")).toEqual(
      {},
    );
  });

  it("flags an invalid email format", () => {
    const errors = validateRegisterForm("not-an-email", "correcthorse1");

    expect(errors.email).toBe("Ingresá un email válido.");
    expect(errors.password).toBeUndefined();
  });

  it("flags a password below the 8-char/letter+digit policy (mirrors RegisterDto's backend regex)", () => {
    const errors = validateRegisterForm("user@example.com", "short1");

    expect(errors.password).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("flags a password with 8+ chars but no digit", () => {
    const errors = validateRegisterForm("user@example.com", "onlyletters");

    expect(errors.password).toBe(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
  });
});

describe("validateLoginForm (pure)", () => {
  it("returns no errors for a valid email and a non-empty password", () => {
    expect(validateLoginForm("user@example.com", "anything")).toEqual({});
  });

  it("flags an invalid email format", () => {
    expect(validateLoginForm("nope", "anything").email).toBe(
      "Ingresá un email válido.",
    );
  });

  it("flags an empty password without checking any policy (login has no complexity rule)", () => {
    expect(validateLoginForm("user@example.com", "").password).toBe(
      "Ingresá tu contraseña.",
    );
  });
});
