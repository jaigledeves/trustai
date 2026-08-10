import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { landingDictionary } from "@/dictionaries/es/landing";

// Same `next/headers` mock pattern as `lib/session.test.ts` — `Nav` reads
// the `theme` cookie server-side (spec: web-theme — mounts `ThemeToggle`
// with the SSR-resolved `initialPreference`) now that it's async.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "system" }) })),
}));

const { Nav } = await import("./Nav");

describe("Nav (spec: public-landing — Landing Composition)", () => {
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

  it("still renders the login and register actions with their own routes", async () => {
    render(await Nav());

    expect(
      screen.getByRole("link", { name: landingDictionary.nav.login }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: landingDictionary.nav.register }),
    ).toHaveAttribute("href", "/register");
  });

  it("mounts ThemeToggle with the initialPreference resolved from the theme cookie (spec: web-theme)", async () => {
    render(await Nav());

    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
  });
});
