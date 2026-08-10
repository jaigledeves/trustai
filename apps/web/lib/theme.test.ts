import { describe, expect, it } from "vitest";

// Isomorphic module — unlike `lib/session.ts`, this file must NOT import
// `next/headers`, so there's nothing to mock here (mirrors the style of
// `lib/session.test.ts` but skips the `vi.mock` step entirely).
import {
  buildThemeCookieOptions,
  buildThemeInitScript,
  parseThemePreference,
  resolveServerHtmlClassName,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
} from "./theme";

describe("parseThemePreference", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
  ] as const)("returns %s for the raw value %s", (raw, expected) => {
    expect(parseThemePreference(raw)).toBe(expected);
  });

  it('defaults to "system" for undefined input', () => {
    expect(parseThemePreference(undefined)).toBe("system");
  });

  it('defaults to "system" for any invalid/unrecognized value', () => {
    expect(parseThemePreference("blue")).toBe("system");
    expect(parseThemePreference("")).toBe("system");
  });
});

describe("resolveServerHtmlClassName", () => {
  it('returns "dark" only for the "dark" preference', () => {
    expect(resolveServerHtmlClassName("dark")).toBe("dark");
  });

  it('returns "" for "light" and "system" (system is resolved client-side, pre-paint)', () => {
    expect(resolveServerHtmlClassName("light")).toBe("");
    expect(resolveServerHtmlClassName("system")).toBe("");
  });
});

describe("buildThemeInitScript", () => {
  it("returns a non-empty string that reads document.cookie, checks matchMedia, and mutates classList", () => {
    const script = buildThemeInitScript();

    expect(typeof script).toBe("string");
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain("matchMedia");
    expect(script).toContain("document.cookie");
    expect(script).toContain("classList");
  });
});

describe("buildThemeCookieOptions (pure — mirrors buildSessionCookieOptions)", () => {
  it("returns the design.md cookie contract: non-httpOnly, Lax, root path, 1-year maxAge", () => {
    const options = buildThemeCookieOptions();

    expect(options.httpOnly).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(THEME_COOKIE_MAX_AGE_SECONDS);
  });
});

describe("constants", () => {
  it("THEME_COOKIE_NAME is 'theme'", () => {
    expect(THEME_COOKIE_NAME).toBe("theme");
  });

  it("THEME_COOKIE_MAX_AGE_SECONDS is one year (31536000s)", () => {
    expect(THEME_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });
});
