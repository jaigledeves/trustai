import { describe, expect, it, vi } from "vitest";
import { shellDictionary } from "@/dictionaries/es/shell";

// `next/font/google` only works through Next's build-time SWC transform;
// imported directly under Vitest it isn't callable. This test only needs
// the exported `metadata` object, not the fonts, so the module is stubbed
// with the same shape `RootLayout` expects (`{ variable }`).
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

const { metadata } = await import("./layout");

describe("RootLayout metadata (spec: RNF-041 — no hardcoded user-facing copy in components)", () => {
  it("sources metadata.description from shellDictionary.meta.description, not a literal string", () => {
    expect(metadata.description).toBe(shellDictionary.meta.description);
  });
});
