import { describe, expect, it } from "vitest";
import { authDictionary } from "./auth";
import { shellDictionary } from "./shell";

/**
 * Recursively collects every leaf value in a dictionary object. Dictionaries
 * are plain nested objects of strings (see shell.ts/auth.ts) — this walks
 * them without hardcoding a shape, so new nested groups stay covered
 * automatically.
 */
function collectLeafValues(node: unknown): unknown[] {
  if (node === null || typeof node !== "object") {
    return [node];
  }
  return Object.values(node as Record<string, unknown>).flatMap(
    collectLeafValues,
  );
}

describe("dictionaries/es", () => {
  it.each([
    ["shellDictionary", shellDictionary],
    ["authDictionary", authDictionary],
  ])(
    "every leaf value in %s is a non-empty string (guards against accidental English/blank literals — RNF-041)",
    (_name, dictionary) => {
      const leaves = collectLeafValues(dictionary);

      expect(leaves.length).toBeGreaterThan(0);
      for (const value of leaves) {
        expect(typeof value).toBe("string");
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    },
  );

  it("authDictionary carries the exact spec-grounded error copy (no enumeration, distinct unverified message)", () => {
    expect(authDictionary.login.errorInvalidCredentials).toBe(
      "Email o contraseña incorrectos.",
    );
    expect(authDictionary.login.errorUnverifiedEmail).toBe(
      "Verificá tu email antes de iniciar sesión.",
    );
    expect(authDictionary.register.errorDuplicateEmail).toBe(
      "Este email ya está registrado.",
    );
  });
});
