import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QuickHelp } from "./quick-help";

describe("QuickHelp (spec: web-plain-language — Reusable Accessible Quick-Help Affordance)", () => {
  it("defaults the trigger's accessible name to `term`", () => {
    render(<QuickHelp term="blockchain" definition="Un registro compartido." />);

    expect(screen.getByRole("button", { name: "blockchain" })).toBeInTheDocument();
  });

  it("overrides the trigger's accessible name via `label`", () => {
    render(
      <QuickHelp term="blockchain" definition="Un registro compartido." label="¿Qué es esto?" />,
    );

    expect(screen.getByRole("button", { name: "¿Qué es esto?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "blockchain" })).not.toBeInTheDocument();
  });

  it("Scenario: Quick-help opens via keyboard — Enter/Space on the focused trigger reveals the definition", async () => {
    const user = userEvent.setup();
    render(<QuickHelp term="huella" definition="Un código único." />);

    expect(screen.queryByText("Un código único.")).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "huella" });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("Un código único.")).toBeInTheDocument();
  });

  it("Scenario: Quick-help opens via tap, no hover required — a click opens the content without any hover simulation", async () => {
    const user = userEvent.setup();
    render(<QuickHelp term="anclar" definition="Guardar la huella para siempre." />);

    const trigger = screen.getByRole("button", { name: "anclar" });
    await user.click(trigger);

    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();
  });

  it("Scenario: Quick-help is dismissible — Escape closes it and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<QuickHelp term="anclar" definition="Guardar la huella para siempre." />);

    const trigger = screen.getByRole("button", { name: "anclar" });
    await user.click(trigger);
    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Guardar la huella para siempre.")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Scenario: Quick-help is dismissible — re-activating the open trigger toggles it closed", async () => {
    const user = userEvent.setup();
    render(<QuickHelp term="anclar" definition="Guardar la huella para siempre." />);

    const trigger = screen.getByRole("button", { name: "anclar" });
    await user.click(trigger);
    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.queryByText("Guardar la huella para siempre.")).not.toBeInTheDocument();
  });
});
