import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { shellDictionary } from "../../dictionaries/es/shell";

// LogoutButton is a client island with its own dedicated test suite; stub
// it here so this test focuses on HeaderAuthActions' own composition
// (same convention as verify/[id]/layout.test.tsx).
vi.mock("./LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const { HeaderAuthActions } = await import("./HeaderAuthActions");

describe("HeaderAuthActions (spec: public-landing — Session-Aware Nav Auth Affordance; web-public-verify — Unified Header Auth Cluster on Verify)", () => {
  it("renders a single Acceder link to /login when logged out", () => {
    render(<HeaderAuthActions isAuthenticated={false} />);

    expect(
      screen.getByRole("link", { name: shellDictionary.nav.signIn }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("link", { name: shellDictionary.nav.dtrs }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
  });

  it("renders Mis DTR and LogoutButton when logged in, no Acceder", () => {
    render(<HeaderAuthActions isAuthenticated={true} />);

    expect(
      screen.getByRole("link", { name: shellDictionary.nav.dtrs }),
    ).toHaveAttribute("href", "/dtrs");
    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: shellDictionary.nav.signIn }),
    ).not.toBeInTheDocument();
  });
});
