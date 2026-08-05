import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
vi.mock("../../../components/shell/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const { default: Layout } = await import("./layout");
const { default: Loading } = await import("./loading");

describe("verify/[id] loading fallback (spec: web-visual-coherence — Decision 7, header persists during suspense)", () => {
  it("renders skeleton content under the persistent layout header", async () => {
    const { container } = render(
      await Layout({ children: <Loading /> }),
    );

    expect(
      screen.getByRole("link", { name: /trust\s*ai/i }),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });
});
