/**
 * Isomorphic theme helpers (design.md: "Cookie + Server Component theming").
 *
 * Deliberately does NOT import `next/headers` — `app/layout.tsx` (Server
 * Component) and `components/shell/ThemeToggle.tsx` (Client Component) both
 * need these pure functions, and only the Server Component may touch
 * `next/headers`. Mirrors the extraction pattern in `lib/session.ts`
 * (`buildSessionCookieOptions`), which is why the cookie-flags builder here
 * is unit-testable without mocking anything.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_COOKIE_NAME = "theme";

/** One year, matching the cookie contract in design.md. */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const VALID_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

function isThemePreference(value: string): value is ThemePreference {
  return (VALID_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Normalizes a raw cookie value into a `ThemePreference`. Anything missing
 * or unrecognized defaults to `"system"` — the safe, no-guess default the
 * server can render without knowing the client's OS preference.
 */
export function parseThemePreference(raw: string | undefined): ThemePreference {
  if (raw !== undefined && isThemePreference(raw)) {
    return raw;
  }
  return "system";
}

/**
 * Maps a preference to the `<html>` className the server can render
 * synchronously. `"system"` deliberately resolves to `""` — the server
 * cannot know the OS preference, so it renders neutral and lets the
 * pre-paint inline script (`buildThemeInitScript`) correct the DOM before
 * first paint (design.md's "No-FOUC / No-Mismatch Reconciliation").
 */
export function resolveServerHtmlClassName(pref: ThemePreference): string {
  return pref === "dark" ? "dark" : "";
}

/**
 * Body of the blocking `<head>` script (design.md §"Sequence: First Load +
 * Toggle"). Runs synchronously during HTML parsing, before React hydrates:
 * - explicit `"dark"`/`"light"` cookie ⇒ applies/removes the class (no-op
 *   when the server already rendered it correctly);
 * - `"system"`/missing cookie ⇒ resolves via `prefers-color-scheme` before
 *   first paint, avoiding a flash of the wrong theme.
 */
export function buildThemeInitScript(): string {
  return `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]*)/);var v=m?decodeURIComponent(m[1]):undefined;var pref=(v==="light"||v==="dark"||v==="system")?v:"system";var isDark=pref==="dark"||(pref==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;if(isDark){c.add("dark")}else{c.remove("dark")}}catch(e){}})();`;
}

export interface ThemeCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/**
 * Pure builder for the `theme` cookie's flags (mirrors
 * `buildSessionCookieOptions`). `httpOnly: false` is the one deliberate
 * inversion of the session cookie's contract — the client (`ThemeToggle`
 * and the inline init script) must be able to read/write this cookie
 * directly, with no server round-trip (design.md's Cookie Contract table).
 */
export function buildThemeCookieOptions(): ThemeCookieOptions {
  return {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
  };
}
