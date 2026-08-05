import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { verifyDictionary } from "../../../dictionaries/es/verify";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
vi.mock("../../../components/shell/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const { default: Layout } = await import("./layout");
const { default: NotFound } = await import("./not-found");

describe("verify/[id] not-found fallback (spec: web-visual-coherence — Decision 7, header persists; web-public-verify — Helpful Empty/Not-Found States)", () => {
  it("renders link-specific not-found copy (verifyDictionary.notFound) and a recovery link back to / under the persistent layout header", async () => {
    render(await Layout({ children: <NotFound /> }));

    // Public nav visible (unauthenticated).
    expect(
      screen.getByRole("navigation", { name: "Secciones" }),
    ).toBeInTheDocument();

    // Verification-specific not-found copy.
    expect(
      screen.getByText(verifyDictionary.notFound.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(verifyDictionary.notFound.description),
    ).toBeInTheDocument();

    // Recovery link back home.
    const recoveryLink = screen.getByRole("link", {
      name: verifyDictionary.notFound.homeLinkLabel,
    });
    expect(recoveryLink).toHaveAttribute("href", "/");

    // Layout's persistent wordmark also points home (public/unauthenticated).
    const brandLinks = screen.getAllByRole("link", { name: /trust\s*ai/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute("href", "/");
    }
  });
});
