import { describe, expect, it } from "vitest";
import { authDictionary } from "./auth";
import { certifyDictionary } from "./certify";
import { historyDictionary } from "./history";
import { landingDictionary } from "./landing";
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
    ["landingDictionary", landingDictionary],
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

  /**
   * Copy-audit for `landingDictionary` (spec: public-landing — Central
   * Artifact Terminology Lock, Honest Verification Demo, Accurate
   * Anchoring Copy, Content-Audit Accuracy). Design.md's assertions 2 and 3
   * are scoped exactly as spec.md's own scenarios state — "hero, how, faq
   * groups" for anchoring accuracy, and only `verificationDemo` for the
   * on-chain-comparison check — not the whole dictionary. Scanning the
   * whole tree for e.g. "hash del archivo" would false-positive on
   * `verificationDemo.recompute`, whose copy legitimately describes the
   * FILE's own hash (mirrors `verifyDictionary.recompute`'s established,
   * approved wording) rather than making an anchoring claim.
   */
  describe("landingDictionary copy audit (spec: public-landing)", () => {
    const { hero, how, faq, useCases, verificationDemo } = landingDictionary;

    it("1. terminology lock: the exact DTR term appears verbatim", () => {
      expect(JSON.stringify(landingDictionary)).toContain(
        "Registro Digital de Confianza (DTR)",
      );
    });

    it("2. accurate anchoring: hero/how/faq copy never claims the file's hash is anchored", () => {
      const anchoringLeaves = [
        ...collectLeafValues(hero),
        ...collectLeafValues(how),
        ...collectLeafValues(faq),
      ] as string[];

      for (const leaf of anchoringLeaves) {
        expect(leaf).not.toMatch(/hash del archivo/i);
        expect(leaf).not.toMatch(/huella del archivo/i);
        expect(leaf).not.toMatch(/el archivo (se )?ancla/i);
      }
    });

    it("3. no on-chain comparison claim: no verificationDemo leaf claims a client recompute matches the anchored hash", () => {
      const leaves = collectLeafValues(verificationDemo) as string[];

      for (const leaf of leaves) {
        const mentionsRecompute = /recalcul/i.test(leaf);
        const mentionsChain = /blockchain|cadena|on-?chain/i.test(leaf);
        expect(mentionsRecompute && mentionsChain).toBe(false);
      }
    });

    it("4. use-case copy never asserts authorship, ownership, or issuer legitimacy", () => {
      for (const item of useCases.items) {
        expect(item.description).not.toMatch(
          /era tuyo|te pertenece|quien firm[oó]|el autor es/i,
        );
      }
    });

    it("5. faq copy never promises pricing or future paid plans", () => {
      for (const item of faq.items) {
        expect(item.answer).not.toMatch(
          /planes.*(anunciar|futuro)|precio|costo futuro/i,
        );
      }
    });

    it("6. HowItWorks technical detail names the real encryption algorithm", () => {
      const combined = (collectLeafValues(how.technicalDetail) as string[]).join(
        " ",
      );
      expect(combined).toMatch(/AES-256-GCM/);
    });

    it("7. HowItWorks technical detail states the canonical-serialization hash is anchored", () => {
      const combined = (collectLeafValues(how.technicalDetail) as string[]).join(
        " ",
      );
      expect(combined).toMatch(/canónic/i);
      expect(combined).toMatch(/SHA-256/);
    });

    it("10. technicalDetail.items is a non-empty array of complete term/desc entries", () => {
      expect(how.technicalDetail.items.length).toBeGreaterThan(0);
      for (const item of how.technicalDetail.items) {
        expect(item.term.trim().length).toBeGreaterThan(0);
        expect(item.desc.trim().length).toBeGreaterThan(0);
      }
    });

    it("11. technicalDetail.contractLabel is a non-empty string", () => {
      expect(how.technicalDetail.contractLabel.trim().length).toBeGreaterThan(
        0,
      );
    });

    it("8. the recompute caveat honestly discloses it does not reconstruct/verify the anchored hash", () => {
      expect(verificationDemo.recompute.caveat).toMatch(
        /no\s+(reconstru\w*|verific\w*).*(canónic\w*|blockchain|anclad\w*)/i,
      );
    });

    it("9. the recompute copy never claims the recomputed hash matches/verifies the anchored one", () => {
      const combined = `${verificationDemo.recompute.statement} ${verificationDemo.recompute.caveat}`;
      expect(combined).not.toMatch(/coincide/i);
    });
  });
});
