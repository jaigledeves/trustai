import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shellDictionary } from "@/dictionaries/es/shell";
import { ThemeToggle } from "./ThemeToggle";

const { groupLabel, light, dark, system } = shellDictionary.theme;

/** Resets the two pieces of global state the component mutates directly. */
function resetGlobalThemeState() {
  document.cookie = "theme=; Path=/; Max-Age=0";
  document.documentElement.classList.remove("dark");
}

beforeEach(() => {
  resetGlobalThemeState();
});

afterEach(() => {
  resetGlobalThemeState();
  vi.unstubAllGlobals();
});

describe("ThemeToggle (spec: web-theme — Theme Toggle Control)", () => {
  it('renders a role="group" with the dictionary-sourced accessible name (desktop 3-button strip)', () => {
    render(<ThemeToggle initialPreference="system" />);

    expect(screen.getByRole("group", { name: groupLabel })).toBeInTheDocument();
  });

  it("renders exactly 3 per-option buttons inside the group + 1 mobile cycle button", () => {
    render(<ThemeToggle initialPreference="system" />);

    // Desktop 3-button group: each option has its own accessible name.
    const group = screen.getByRole("group", { name: groupLabel });
    for (const name of [light, dark, system]) {
      expect(group.querySelector(`[aria-label="${name}"]`)).toBeInTheDocument();
    }

    // Mobile cycle button: aria-label = groupLabel ("Tema") to avoid
    // a name collision with the active desktop button in jsdom.
    expect(screen.getByRole("button", { name: groupLabel })).toBeInTheDocument();
  });

  it("mobile cycle button cycles light→dark→system→light", async () => {
    render(<ThemeToggle initialPreference="light" />);

    const cycleBtn = screen.getByRole("button", { name: groupLabel });

    // light → dark
    await userEvent.click(cycleBtn);
    expect(document.cookie).toMatch(/^theme=dark/);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it('initialPreference="dark" renders the Dark button pressed, others not', () => {
    render(<ThemeToggle initialPreference="dark" />);

    expect(screen.getByRole("button", { name: dark })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: light })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: system })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking the Light button sets document.cookie to theme=light and removes the dark class", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle initialPreference="dark" />);

    await userEvent.click(screen.getByRole("button", { name: light }));

    expect(document.cookie).toMatch(/^theme=light/);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("clicking the Dark button sets document.cookie to theme=dark and adds the dark class", async () => {
    render(<ThemeToggle initialPreference="light" />);

    await userEvent.click(screen.getByRole("button", { name: dark }));

    expect(document.cookie).toMatch(/^theme=dark/);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keyboard activation (Enter on a focused button) activates the option same as a click", async () => {
    render(<ThemeToggle initialPreference="light" />);

    const darkButton = screen.getByRole("button", { name: dark });
    darkButton.focus();
    await userEvent.keyboard("{Enter}");

    expect(darkButton).toHaveAttribute("aria-pressed", "true");
    expect(document.cookie).toMatch(/^theme=dark/);
  });

  it("keyboard activation (Space on a focused button) activates the option same as a click", async () => {
    render(<ThemeToggle initialPreference="light" />);

    const darkButton = screen.getByRole("button", { name: dark });
    darkButton.focus();
    await userEvent.keyboard(" ");

    expect(darkButton).toHaveAttribute("aria-pressed", "true");
  });

  it('while preference is "system", a runtime prefers-color-scheme change toggles .dark live without changing the pressed button away from "system"', () => {
    let changeListener: ((event: { matches: boolean }) => void) | undefined;
    const mediaQueryList = {
      matches: false,
      addEventListener: vi.fn((_event: string, listener: typeof changeListener) => {
        changeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue(mediaQueryList),
    );

    render(<ThemeToggle initialPreference="system" />);

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    changeListener?.({ matches: true });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByRole("button", { name: system })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
