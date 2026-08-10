"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { shellDictionary } from "@/dictionaries/es/shell";
import {
  buildThemeCookieOptions,
  THEME_COOKIE_NAME,
  type ThemePreference,
} from "@/lib/theme";
import { Button } from "../ui/button";

interface ThemeToggleProps {
  /** SSR-supplied (design.md) — avoids any client-only default flash of
   * the pressed state; the server already resolved this from the cookie. */
  initialPreference: ThemePreference;
}

const OPTIONS: readonly {
  value: ThemePreference;
  Icon: typeof Sun;
}[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

function resolvesToDark(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

function writeThemeCookie(preference: ThemePreference) {
  const options = buildThemeCookieOptions();
  document.cookie = `${THEME_COOKIE_NAME}=${preference}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax`;
}

/**
 * Light/dark/system toggle (spec: web-theme — "Theme Toggle Control").
 * Decision #1 (design.md): 3 independent `<button aria-pressed>` in a
 * `role="group"` — no new radix primitive, native buttons get Tab/Enter/
 * Space for free. Decision #2: the "system" icon (`Monitor`) is static,
 * never swapped for a resolved sun/moon — every button's `aria-pressed` is
 * 100% derivable from `preference` alone, so there is no client-only state
 * and no mounted-guard needed here.
 */
export function ThemeToggle({ initialPreference }: ThemeToggleProps) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const t = shellDictionary.theme;

  function selectPreference(next: ThemePreference) {
    setPreference(next);
    writeThemeCookie(next);
    applyDarkClass(resolvesToDark(next));
  }

  // spec: web-theme — "System Theme Follows OS Preference", "Runtime OS
  // change updates the theme". Only attached while `preference === "system"`
  // (design.md's sequence note); cleaned up on unmount or preference change.
  useEffect(() => {
    if (preference !== "system") {
      return;
    }
    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    applyDarkClass(mediaQueryList.matches);

    function handleChange(event: { matches: boolean }) {
      applyDarkClass(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [preference]);

  return (
    <div role="group" aria-label={t.groupLabel} className="flex items-center gap-0.5">
      {OPTIONS.map(({ value, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-pressed={preference === value}
          aria-label={t[value]}
          onClick={() => selectPreference(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
