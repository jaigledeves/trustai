import { describe, expect, it } from "vitest";
import { authDictionary } from "../../dictionaries/es/auth";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { ApiError, mapApiError } from "./errors";

describe("mapApiError (pure — spec: no enumeration on login or register, distinct unverified copy)", () => {
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

  it("never maps a register 409 to an 'already registered' message (no account enumeration)", () => {
    expect(mapApiError(409, "register")).toBe(
      "Ocurrió un error inesperado. Prueba de nuevo en unos minutos.",
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

  it("maps 413 in the upload context to the file-too-large message", () => {
    expect(mapApiError(413, "upload")).toBe(certifyDictionary.upload.errorTooLarge);
  });

  it("falls back to the upload-specific generic message for other upload failures", () => {
    expect(mapApiError(500, "upload")).toBe(certifyDictionary.upload.errorGeneric);
  });

  it("maps 413 in the verifyUpload context to the verify file-too-large message", () => {
    expect(mapApiError(413, "verifyUpload")).toBe(verifyDictionary.upload.errorTooLarge);
  });

  it("falls back to the verify-specific generic message for other verifyUpload failures", () => {
    expect(mapApiError(429, "verifyUpload")).toBe(verifyDictionary.upload.errorGeneric);
  });

  it("never states a specific size limit, since the effective cap depends on the deployment", () => {
    for (const copy of [
      certifyDictionary.upload.errorTooLarge,
      verifyDictionary.upload.errorTooLarge,
    ]) {
      expect(copy).not.toMatch(/[0-9]/);
    }
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
