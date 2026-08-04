import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WizardStepInfo } from "./wizard-step";
import { WizardStepper } from "./WizardStepper";

function step(overrides: Partial<WizardStepInfo>): WizardStepInfo {
  return { id: "upload", label: "Subida", status: "upcoming", ...overrides };
}

/**
 * spec: web-certify-flow — "Five-Step Progress Indicator": completed,
 * current, and upcoming steps MUST be visually distinguishable. Purely
 * presentational (design.md "Component decomposition") — renders exactly
 * what `resolveWizardSteps` hands it, zero business logic.
 */
describe("WizardStepper (spec: web-certify-flow — Five-Step Progress Indicator)", () => {
  it("renders every step's label", () => {
    render(
      <WizardStepper
        steps={[
          step({ id: "upload", label: "Subida", status: "complete" }),
          step({ id: "analysis", label: "Análisis de IA", status: "complete" }),
          step({ id: "review", label: "Revisión", status: "current" }),
          step({ id: "anchor", label: "Anclaje", status: "upcoming" }),
          step({ id: "certified", label: "Certificado", status: "upcoming" }),
        ]}
      />,
    );

    for (const label of ["Subida", "Análisis de IA", "Revisión", "Anclaje", "Certificado"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks completed, current, upcoming, and error steps with distinct, queryable states", () => {
    render(
      <WizardStepper
        steps={[
          step({ id: "upload", label: "Subida", status: "complete" }),
          step({ id: "analysis", label: "Análisis de IA", status: "error" }),
          step({ id: "review", label: "Revisión", status: "upcoming" }),
          step({ id: "anchor", label: "Anclaje", status: "current" }),
          step({ id: "certified", label: "Certificado", status: "upcoming" }),
        ]}
      />,
    );

    expect(screen.getByText("Subida").closest("li")).toHaveAttribute("data-status", "complete");
    expect(screen.getByText("Análisis de IA").closest("li")).toHaveAttribute("data-status", "error");
    expect(screen.getByText("Revisión").closest("li")).toHaveAttribute("data-status", "upcoming");
    expect(screen.getByText("Anclaje").closest("li")).toHaveAttribute("data-status", "current");
    expect(screen.getByText("Certificado").closest("li")).toHaveAttribute("data-status", "upcoming");

    // The current step is the one exposed to assistive tech as the active
    // step (spec: "current step" must be identifiable, not just colored).
    expect(screen.getByText("Anclaje").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Subida").closest("li")).not.toHaveAttribute("aria-current");
  });

  it("still renders exactly 5 items when a step is in the error state (indicator never grows a 6th step)", () => {
    const { container } = render(
      <WizardStepper
        steps={[
          step({ id: "upload", status: "complete" }),
          step({ id: "analysis", status: "error" }),
          step({ id: "review", status: "upcoming" }),
          step({ id: "anchor", status: "upcoming" }),
          step({ id: "certified", status: "upcoming" }),
        ]}
      />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(5);
  });
});
