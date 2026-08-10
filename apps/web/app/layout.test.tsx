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

const mockCookieStore = {
  get: vi.fn(),
};

// Same mocking pattern as `lib/session.test.ts` — `RootLayout` reads the
// `theme` cookie server-side to pick the SSR `<html>` class (spec:
// web-theme — "SSR Renders Correct Theme Class").
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const { metadata, default: RootLayout } = await import("./layout");

describe("RootLayout metadata (spec: RNF-041 — no hardcoded user-facing copy in components)", () => {
  it("sources metadata.description from shellDictionary.meta.description, not a literal string", () => {
    expect(metadata.description).toBe(shellDictionary.meta.description);
  });
});

describe("RootLayout SSR theme class (spec: web-theme — SSR Renders Correct Theme Class, No FOUC)", () => {
  it('renders <html> with the "dark" class when the theme cookie is "dark"', async () => {
    mockCookieStore.get.mockReturnValue({ value: "dark" });

    const element = await RootLayout({ children: null });

    expect(element.props.className).toMatch(/\bdark\b/);
  });

  it('renders <html> without the "dark" class when the theme cookie is "light"', async () => {
    mockCookieStore.get.mockReturnValue({ value: "light" });

    const element = await RootLayout({ children: null });

    expect(element.props.className).not.toMatch(/\bdark\b/);
  });

  it('renders <html> without the "dark" class when the theme cookie is absent (system is resolved client-side pre-paint, never guessed server-side)', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const element = await RootLayout({ children: null });

    expect(element.props.className).not.toMatch(/\bdark\b/);
  });

  it("sets suppressHydrationWarning on <html> (required escape hatch for the pre-paint script mutating the class)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "system" });

    const element = await RootLayout({ children: null });

    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it("injects the blocking init script as the first child of <head>", async () => {
    mockCookieStore.get.mockReturnValue({ value: "system" });

    const element = await RootLayout({ children: null });
    const head = element.props.children[0];

    expect(head.type).toBe("head");
    const firstChild = Array.isArray(head.props.children)
      ? head.props.children[0]
      : head.props.children;
    expect(firstChild.type).toBe("script");
    expect(firstChild.props.dangerouslySetInnerHTML.__html).toContain("matchMedia");
  });
});
