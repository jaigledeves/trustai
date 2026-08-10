import { describe, expect, it } from "vitest";
import { authDictionary } from "./auth";
import { certifyDictionary } from "./certify";
import { glossaryDictionary } from "./glossary";
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
    ["glossaryDictionary", glossaryDictionary],
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

  it("shellDictionary.theme has non-empty groupLabel/light/dark/system keys (spec: web-theme — dictionary-sourced accessible names)", () => {
    const { theme } = shellDictionary;

    for (const key of ["groupLabel", "light", "dark", "system"] as const) {
      expect(typeof theme[key]).toBe("string");
      expect(theme[key].trim().length).toBeGreaterThan(0);
    }
  });

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

  /**
   * Copy-audit for `verifyDictionary` (spec: web-public-verify — Refocus
   * Verify Page Copy, ADR-009/Option W). Covers the reworded verdict
   * messages, the new `legal` disclaimer group, the honest testnet badge,
   * and the shared-surface constraint with `landingDictionary`'s
   * `verificationDemo` (design.md's confirmed cross-read).
   */
  describe("verifyDictionary copy audit (spec: web-public-verify)", () => {
    it("verdict messages never use bare jargon (DTR, SHA-256, hash canónico)", () => {
      for (const verdict of Object.values(verifyDictionary.verdicts)) {
        expect(verdict.message).not.toMatch(/\bDTR\b/i);
        expect(verdict.message).not.toMatch(/SHA-256/i);
        expect(verdict.message).not.toMatch(/hash canónico/i);
      }
    });

    it("legal.disclaimer references eIDAS/firma electrónica cualificada, never an authorship/ownership claim", () => {
      expect(verifyDictionary.legal.disclaimer).toMatch(
        /eIDAS|firma electrónica cualificada/i,
      );
      expect(verifyDictionary.legal.disclaimer).not.toMatch(
        /autor|pertenece|propiedad/i,
      );
      expect(verifyDictionary.legal.disclaimer).not.toMatch(/autoría|author/i);
    });

    it("recompute.caveat still asserts only independent file-hash computation, never on-chain reconstruction", () => {
      expect(verifyDictionary.recompute.caveat).toMatch(
        /no\s+(reconstru\w*|verific\w*).*(canónic\w*|blockchain|anclad\w*)/i,
      );
    });

    it("page.badge describes public checkable verification in plain language, naming neither the network nor 'testnet', never implying mainnet/production (spec: web-public-verify — Honest Page Badge)", () => {
      expect(verifyDictionary.page.badge).not.toMatch(/Base Sepolia/i);
      expect(verifyDictionary.page.badge).not.toMatch(/testnet/i);
      expect(verifyDictionary.page.badge).not.toMatch(/mainnet|producci[oó]n/i);
    });

    it("always-visible upload prose uses 'huella', never bare 'hash' (spec: web-plain-language — One Fingerprint Term Site-Wide; the panel renders ungated in UploadVerdictPanel)", () => {
      const alwaysVisibleProse = [
        verifyDictionary.upload.panelTitle,
        verifyDictionary.upload.panelDescription,
      ];

      for (const value of alwaysVisibleProse) {
        expect(value.toLowerCase()).not.toMatch(/\bhash\b/);
      }
    });

    it("verdicts.* stay non-empty for the shared VerificationDemo cross-read (public-landing)", () => {
      for (const verdict of Object.values(verifyDictionary.verdicts)) {
        expect(verdict.title.trim().length).toBeGreaterThan(0);
        expect(verdict.message.trim().length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Cross-dictionary consistency assertions (spec: web-plain-language — One
   * Fingerprint Term Site-Wide, One Canonical On-Chain Verb Site-Wide, One
   * Canonical DTR Name With Expand-on-First-Use). These compare strings
   * ACROSS dictionary modules, so they live at the top level rather than
   * inside a single dictionary's own copy-audit `describe` block.
   */
  describe("cross-dictionary consistency (spec: web-plain-language)", () => {
    it("uses one canonical on-chain verb lemma ('ancl') across every on-chain-action/state string; no string re-introduces 'registrar' as a synonym verb", () => {
      const onChainActionStrings = [
        certifyDictionary.stepper.anchorLabel,
        certifyDictionary.anchor.anchoringMessage,
        certifyDictionary.anchor.retryingMessage,
        certifyDictionary.anchor.slowMessage,
        certifyDictionary.anchor.errorGeneric,
        historyDictionary.states.ANCHORING,
        historyDictionary.detail.anchorNotAnchored,
        verifyDictionary.landing.anchorNotAnchoredLabel,
        verifyDictionary.verdicts.PENDING_ANCHOR.message,
      ];

      for (const value of onChainActionStrings) {
        expect(value.toLowerCase()).toMatch(/ancl/);
        // "registro"/"registros" (the DTR-artifact noun) stays legal; only the
        // "registrar" verb family ("registra", "registrando", "registrado")
        // is forbidden here — every one of those forms contains "registra".
        expect(value.toLowerCase()).not.toMatch(/registra/);
      }

      // `certifiedMessage` is user-approved verbatim copy that describes the
      // COMPLETED state ("Puedes ver el comprobante en la blockchain") rather
      // than the in-progress on-chain action, so it legitimately doesn't
      // repeat the "ancl" verb — it's still checked for the forbidden
      // "registrar" synonym alongside the others.
      expect(certifyDictionary.anchor.certifiedMessage.toLowerCase()).not.toMatch(/registra/);
    });

    it("no dictionary module contains the English DTR name 'Digital Trust Records'", () => {
      const dictionaries: Record<string, unknown> = {
        shellDictionary,
        authDictionary,
        certifyDictionary,
        historyDictionary,
        verifyDictionary,
        landingDictionary,
        glossaryDictionary,
      };

      for (const [name, dictionary] of Object.entries(dictionaries)) {
        expect(JSON.stringify(dictionary), `${name} must not contain "Digital Trust Records"`).not.toContain(
          "Digital Trust Records",
        );
      }
    });

    it("landing's hero badge and hero card never name the network/testnet (spec: public-landing — Testnet Naming Confined to FAQ)", () => {
      const heroStrings = [
        landingDictionary.hero.badge,
        landingDictionary.hero.card.statusBadge,
        landingDictionary.hero.card.network,
        landingDictionary.hero.card.footerNote,
      ];

      for (const value of heroStrings) {
        expect(value).not.toMatch(/Base Sepolia/i);
        expect(value).not.toMatch(/testnet/i);
      }
    });

    it("uses 'huella' (not bare 'hash') as the fingerprint noun in every hero/primary-flow fingerprint label outside a technical disclosure", () => {
      const fingerprintLabels = [
        landingDictionary.hero.card.hashLabel,
        certifyDictionary.confirm.frozenHashLabel,
        historyDictionary.detail.canonicalHashLabel,
        verifyDictionary.recompute.title,
        verifyDictionary.recompute.hashLabel,
      ];

      for (const label of fingerprintLabels) {
        expect(label.toLowerCase()).toMatch(/huella/);
        expect(label.toLowerCase()).not.toMatch(/\bhash\b/);
      }
    });
  });
});
