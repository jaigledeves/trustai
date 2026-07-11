import { describe, expect, it } from "vitest";
import { authDictionary } from "./auth";
import { certifyDictionary } from "./certify";
import { historyDictionary } from "./history";
import { shellDictionary } from "./shell";
import { verifyDictionary } from "./verify";

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
    ["certifyDictionary", certifyDictionary],
    ["historyDictionary", historyDictionary],
    ["verifyDictionary", verifyDictionary],
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
      "Verifica tu email antes de iniciar sesión.",
    );
    expect(authDictionary.register.errorDuplicateEmail).toBe(
      "Este email ya está registrado.",
    );
  });

  it("certify give-up copy says auto-update STOPPED and to reload — never implies it keeps updating on its own (matches the cap returning `false`)", () => {
    // Once the poll cap is hit the interval returns `false`: nothing updates
    // unless the user reloads. The copy must tell them so, not tell them to
    // "wait a bit more" / "come back later" against a page that stopped polling.
    for (const message of [
      certifyDictionary.anchor.slowMessage,
      certifyDictionary.review.analysisSlow,
    ]) {
      expect(message).toMatch(/recarg/i);
      expect(message).not.toMatch(/esperar un poco/i);
      expect(message).not.toMatch(/volvé más tarde/i);
    }
  });
});
