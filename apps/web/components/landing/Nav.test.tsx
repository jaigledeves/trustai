import { cookies } from "next/headers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { landingDictionary } from "@/dictionaries/es/landing";
import { shellDictionary } from "@/dictionaries/es/shell";

// Same `next/headers` mock pattern as `verify/[id]/layout.test.tsx` — `Nav`
// reads the `theme` cookie (spec: web-theme) and, now, the session cookie
// via `getSession()` (spec: public-landing — Session-Aware Nav Auth
// Affordance). Default: no session cookie → unauthenticated (public nav).
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === "theme" ? { value: "system" } : undefined),
  })),
}));

// LogoutButton is a client island with its own dedicated test suite; stub
// it here so this test focuses on Nav's own composition (same convention
// as verify/[id]/layout.test.tsx).
vi.mock("@/components/shell/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const { Nav } = await import("./Nav");

describe("Nav (spec: public-landing — Landing Composition, Session-Aware Nav Auth Affordance)", () => {
  const { sectionLinks } = landingDictionary.nav;

  it("renders the four in-page anchor links targeting each section id", async () => {
    render(await Nav());

    const expected = [
      { label: sectionLinks.howItWorks, href: "#como-funciona" },
      { label: sectionLinks.verification, href: "#verificacion" },
      { label: sectionLinks.useCases, href: "#casos" },
      { label: sectionLinks.faq, href: "#faq" },
    ];

    for (const { label, href } of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("anchor hrefs stay same-page hashes — they never point at an auth/guarded route", async () => {
    render(await Nav());

    for (const label of Object.values(sectionLinks)) {
      const href = screen.getByRole("link", { name: label }).getAttribute("href");
      expect(href).toMatch(/^#/);
    }
  });

  it("logged-out: shows a single Acceder action, no Crear cuenta button or login icon", async () => {
    render(await Nav());

    expect(
      screen.getByRole("link", { name: shellDictionary.nav.signIn }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("link", { name: shellDictionary.nav.dtrs }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
  });

  it("logged-in: shows Mis DTR and Cerrar sesión, no Certificar shortcut", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: (name: string) =>
        name === "theme" ? { value: "system" } : { value: "test-token" },
    } as never);

    render(await Nav());

    expect(
      screen.getByRole("link", { name: shellDictionary.nav.dtrs }),
    ).toHaveAttribute("href", "/dtrs");
    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
    // ThemeToggle is auth-state-independent: it sits outside the auth branch
    // and must render in the logged-in nav too (spec: public-landing —
    // "ThemeToggle and section links unaffected by auth state").
    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: shellDictionary.nav.signIn }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /certificar/i }),
    ).not.toBeInTheDocument();
  });

  it("mounts ThemeToggle with the initialPreference resolved from the theme cookie (spec: web-theme)", async () => {
    render(await Nav());

    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
  });
});
