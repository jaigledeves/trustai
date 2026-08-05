import { describe, expect, it } from "vitest";
import { authDictionary } from "../../dictionaries/es/auth";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { ApiError, mapApiError } from "./errors";

describe("mapApiError (pure — spec: no enumeration on login, distinct unverified/duplicate copy)", () => {
  it("maps 401 in the login context to the generic no-enumeration message", () => {
    expect(mapApiError(401, "login")).toBe(
      authDictionary.login.errorInvalidCredentials,
    );
  });

  it("maps 403 in the login context to the distinct unverified-email message", () => {
    expect(mapApiError(403, "login")).toBe(
      authDictionary.login.errorUnverifiedEmail,
    );
  });

  it("maps 409 in the register context to the duplicate-email message", () => {
    expect(mapApiError(409, "register")).toBe(
      authDictionary.register.errorDuplicateEmail,
    );
  });

  it("falls back to a generic message for an unmapped status/context pair", () => {
    expect(mapApiError(500, "login")).toBe(
      "Ocurrió un error inesperado. Prueba de nuevo en unos minutos.",
    );
  });

  it("maps 409 in the review context to the edit-conflict message (INV-21 — refresh, never show the edit as applied)", () => {
    expect(mapApiError(409, "review")).toBe(certifyDictionary.review.editConflict);
  });

  it("maps 409 in the confirm context to the certify-blocked message", () => {
    expect(mapApiError(409, "confirm")).toBe(certifyDictionary.confirm.errorGeneric);
  });

  it("maps 409 in the anchor context to the anchor-blocked message", () => {
    expect(mapApiError(409, "anchor")).toBe(certifyDictionary.anchor.errorGeneric);
  });

  it("maps 400 in the resetPassword context to the invalid/expired token message", () => {
    expect(mapApiError(400, "resetPassword")).toBe(
      authDictionary.resetPassword.errorInvalidToken,
    );
  });
});

describe("ApiError", () => {
  it("carries the HTTP status and message from the failed response", () => {
    const error = new ApiError(409, "Email is already registered");

    expect(error.status).toBe(409);
    expect(error.message).toBe("Email is already registered");
    expect(error).toBeInstanceOf(Error);
  });
});
