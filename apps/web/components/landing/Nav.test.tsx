import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingDictionary } from "@/dictionaries/es/landing";
import { Nav } from "./Nav";

describe("Nav (spec: public-landing — Landing Composition)", () => {
  const { sectionLinks } = landingDictionary.nav;

  it("renders the four in-page anchor links targeting each section id", () => {
    render(<Nav />);

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

  it("anchor hrefs stay same-page hashes — they never point at an auth/guarded route", () => {
    render(<Nav />);

    for (const label of Object.values(sectionLinks)) {
      const href = screen.getByRole("link", { name: label }).getAttribute("href");
      expect(href).toMatch(/^#/);
    }
  });

  it("still renders the login and register actions with their own routes", () => {
    render(<Nav />);

    expect(
      screen.getByRole("link", { name: landingDictionary.nav.login }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: landingDictionary.nav.register }),
    ).toHaveAttribute("href", "/register");
  });
});
