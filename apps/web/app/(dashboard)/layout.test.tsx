import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Same `next/headers` mock pattern as `lib/session.test.ts` — this layout
// reads BOTH the session cookie (`getSession`, belt-and-suspenders auth
// check) and the `theme` cookie (spec: web-theme — mounts `ThemeToggle`
// with the SSR-resolved `initialPreference`).
const cookieValues: Record<string, string | undefined> = {
  trustai_session: "test-session-token",
  theme: "dark",
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieValues[name] !== undefined ? { value: cookieValues[name] } : undefined,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// LogoutButton is a client island calling useRouter(); stub it so this
// async Server Component test doesn't need a router context (same pattern
// as verify/[id]/layout.test.tsx).
vi.mock("../../components/shell/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const { default: DashboardLayout } = await import("./layout");

describe("DashboardLayout (spec: web-theme — Theme Toggle Control, shell nav placement)", () => {
  it('mounts ThemeToggle in the header with initialPreference resolved from the "theme" cookie', async () => {
    render(await DashboardLayout({ children: <p>CHILD_CONTENT</p> }));

    expect(
      screen.getByRole("button", { name: "Oscuro" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("CHILD_CONTENT")).toBeInTheDocument();
  });
});
