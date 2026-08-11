import { cookies } from "next/headers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/headers so getSession() works in the Vitest environment.
// Default: no cookie → unauthenticated (public nav), "system" theme.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === "theme" ? { value: "system" } : undefined),
  })),
}));

// LogoutButton is a client island; stub it so the async Server Component
// test doesn't need a router/action context.
vi.mock("../../../components/shell/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

// Dynamic import AFTER mocks are in place (same pattern as dtrs/page.test.tsx).
const { default: VerifyIdLayout } = await import("./layout");

describe("verify/[id] layout (spec: web-visual-coherence — Decision 7, persistent header; web-public-verify — session-aware nav)", () => {
  it("renders the public section nav when the visitor is not authenticated", async () => {
    // Default mock: no session cookie → public nav branch.
    render(await VerifyIdLayout({ children: <p>CHILD_CONTENT</p> }));

    // Wordmark links back to the landing.
    expect(screen.getByRole("link", { name: /ancr\s*ux/i })).toHaveAttribute(
      "href",
      "/",
    );
    // Public landing section links visible.
    expect(
      screen.getByRole("navigation", { name: "Secciones" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CHILD_CONTENT")).toBeInTheDocument();
  });

  it("renders the app nav (Mis DTR, Certificar documento) when the visitor is authenticated", async () => {
    // Override: return a session token for this one call.
    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: "test-token" }),
    } as never);

    render(await VerifyIdLayout({ children: <p>CHILD_CONTENT</p> }));

    // Wordmark now links to the authenticated dashboard.
    expect(screen.getByRole("link", { name: /ancr\s*ux/i })).toHaveAttribute(
      "href",
      "/dtrs",
    );
    // Landing section links are replaced by app nav.
    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /mis dtr/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /certificar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("CHILD_CONTENT")).toBeInTheDocument();
  });

  it("mounts ThemeToggle for an unauthenticated visitor too (spec: web-theme — toggle present on /verify/[id])", async () => {
    render(await VerifyIdLayout({ children: <p>CHILD_CONTENT</p> }));

    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
  });

  it("mounts ThemeToggle for an authenticated visitor too (spec: web-theme — toggle present regardless of auth state)", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: (name: string) =>
        name === "theme" ? { value: "system" } : { value: "test-token" },
    } as never);

    render(await VerifyIdLayout({ children: <p>CHILD_CONTENT</p> }));

    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
  });
});
