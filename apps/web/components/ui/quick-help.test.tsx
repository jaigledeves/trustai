import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QuickHelp } from "./quick-help";

describe("QuickHelp (spec: web-plain-language — Reusable Accessible Quick-Help Affordance)", () => {
  it("uses `title` as the ⓘ trigger's accessible name, and does not render its content until opened", () => {
    render(
      <QuickHelp title="¿Qué es una blockchain?" definition="Un registro compartido." />,
    );

    expect(
      screen.getByRole("button", { name: "¿Qué es una blockchain?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Un registro compartido.")).not.toBeInTheDocument();
  });

  it("Scenario: Quick-help reveals both the heading and the body — an opened panel shows the title text and the definition", async () => {
    const user = userEvent.setup();
    render(<QuickHelp title="¿Qué es la huella?" definition="Un código único." />);

    await user.click(screen.getByRole("button", { name: "¿Qué es la huella?" }));

    // The title appears twice conceptually (accessible name + visible heading);
    // the visible heading and the body are both present once opened.
    expect(screen.getByText("¿Qué es la huella?")).toBeInTheDocument();
    expect(screen.getByText("Un código único.")).toBeInTheDocument();
  });

  it("Scenario: Quick-help opens via keyboard — Enter on the focused trigger reveals the definition", async () => {
    const user = userEvent.setup();
    render(<QuickHelp title="¿Qué es la huella?" definition="Un código único." />);

    expect(screen.queryByText("Un código único.")).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "¿Qué es la huella?" });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("Un código único.")).toBeInTheDocument();
  });

  it("Scenario: Quick-help opens via tap, no hover required — a click opens the content without any hover simulation", async () => {
    const user = userEvent.setup();
    render(
      <QuickHelp title="¿Qué significa anclar?" definition="Guardar la huella para siempre." />,
    );

    await user.click(screen.getByRole("button", { name: "¿Qué significa anclar?" }));

    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();
  });

  it("Scenario: Quick-help is dismissible — Escape closes it and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <QuickHelp title="¿Qué significa anclar?" definition="Guardar la huella para siempre." />,
    );

    const trigger = screen.getByRole("button", { name: "¿Qué significa anclar?" });
    await user.click(trigger);
    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Guardar la huella para siempre.")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Scenario: Quick-help is dismissible — re-activating the open trigger toggles it closed", async () => {
    const user = userEvent.setup();
    render(
      <QuickHelp title="¿Qué significa anclar?" definition="Guardar la huella para siempre." />,
    );

    const trigger = screen.getByRole("button", { name: "¿Qué significa anclar?" });
    await user.click(trigger);
    expect(screen.getByText("Guardar la huella para siempre.")).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.queryByText("Guardar la huella para siempre.")).not.toBeInTheDocument();
  });
});
