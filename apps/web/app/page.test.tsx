import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// VerificationDemo has its own dedicated test suite
// (components/landing/VerificationDemo.test.tsx) — mocked here so this
// suite isolates page-level composition (spec: public-landing — Landing
// Composition), mirroring how `verify/[id]/page.test.tsx` mocks its heavy
// children.
vi.mock("@/components/landing/VerificationDemo", () => ({
  VerificationDemo: () => <div>VERIFICATION_DEMO_MARKER</div>,
}));

// `Nav` is now an async Server Component (spec: web-theme — it reads the
// `theme` cookie to mount `ThemeToggle`) and has its own dedicated test
// suite (components/landing/Nav.test.tsx). `@testing-library/react`'s
// client `render()` can't resolve an async component nested under this
// sync `LandingPage` the way the real Next.js RSC renderer does, so it's
// mocked here — this suite only cares about section ORDERING, same
// rationale as the `VerificationDemo` mock above.
vi.mock("@/components/landing/Nav", async () => {
  const { landingDictionary } = await import("@/dictionaries/es/landing");
  return {
    Nav: () => (
      <header>
        <a href="/login">{landingDictionary.nav.login}</a>
        <a href="/register">{landingDictionary.nav.register}</a>
      </header>
    ),
  };
});

describe("LandingPage (spec: public-landing — Landing Composition, Config-Driven Navigation & Links)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders Nav, Hero, HowItWorks, VerificationDemo, UseCases, Pillars, Faq, FinalCta, and Footer exactly once, in that order", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_DTR_ID", "demo-dtr-1");
    const { default: LandingPage } = await import("./page");
    const { landingDictionary } = await import("@/dictionaries/es/landing");

    render(<LandingPage />);

    const orderedMarkers = [
      landingDictionary.nav.register,
      landingDictionary.hero.title,
      landingDictionary.how.title,
      "VERIFICATION_DEMO_MARKER",
      landingDictionary.useCases.title,
      landingDictionary.pillars.title,
      landingDictionary.faq.title,
      landingDictionary.cta.title,
      landingDictionary.footer.copyright,
    ];

    const body = document.body.textContent ?? "";
    const positions = orderedMarkers.map((marker) => body.indexOf(marker));

    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
    }

    expect(screen.getAllByText("VERIFICATION_DEMO_MARKER")).toHaveLength(1);
  });

  it("renders the guarded demo-verification CTA linking to /verify/:id when config.demoDtrId is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_DTR_ID", "demo-dtr-1");
    const { default: LandingPage } = await import("./page");
    const { landingDictionary } = await import("@/dictionaries/es/landing");

    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: landingDictionary.hero.secondaryCta }),
    ).toHaveAttribute("href", "/verify/demo-dtr-1");
  });

  it("hides the demo-verification CTA when config.demoDtrId is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_DTR_ID", "");
    const { default: LandingPage } = await import("./page");
    const { landingDictionary } = await import("@/dictionaries/es/landing");

    render(<LandingPage />);

    expect(
      screen.queryByRole("link", { name: landingDictionary.hero.secondaryCta }),
    ).not.toBeInTheDocument();
  });
});
