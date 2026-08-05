import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyDictionary } from "../../../dictionaries/es/verify";

vi.mock("../../../components/verify/HashOnlyCard", () => ({
  HashOnlyCard: () => <div>HASH_ONLY_CARD</div>,
}));
vi.mock("../../../components/verify/UploadVerdictPanel", () => ({
  UploadVerdictPanel: () => <div>UPLOAD_VERDICT_PANEL</div>,
}));

describe("VerifyPage (spec: web-public-verify — No-Auth Access)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders fully with no session check or login prompt when the feature flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED", "true");
    const { default: VerifyPage } = await import("./page");

    const jsx = await VerifyPage({ params: Promise.resolve({ id: "rec-1" }) });
    render(jsx);

    expect(screen.getByText("HASH_ONLY_CARD")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD_VERDICT_PANEL")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it("renders a dark 'no disponible' state with a home recovery link, mounting neither component, when the feature flag is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED", "false");
    const { default: VerifyPage } = await import("./page");

    const jsx = await VerifyPage({ params: Promise.resolve({ id: "rec-1" }) });
    render(jsx);

    expect(screen.getByText(verifyDictionary.page.disabled.message)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: verifyDictionary.page.disabled.homeLinkLabel }),
    ).toHaveAttribute("href", "/");
    expect(screen.queryByText("HASH_ONLY_CARD")).not.toBeInTheDocument();
    expect(screen.queryByText("UPLOAD_VERDICT_PANEL")).not.toBeInTheDocument();
  });
});
