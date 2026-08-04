import { describe, expect, it } from "vitest";
import { certifyDictionary } from "../../dictionaries/es/certify";
import type { TrustRecordDetail } from "../../lib/api/types";
import { resolveWizardSteps } from "./wizard-step";

type WizardRecordInput = Pick<
  TrustRecordDetail,
  "state" | "aiSummary" | "analysisFailureReason"
>;

function record(overrides: Partial<WizardRecordInput>): WizardRecordInput {
  return {
    state: "DRAFT",
    aiSummary: null,
    analysisFailureReason: null,
    ...overrides,
  };
}

/**
 * spec: web-certify-flow — "Five-Step Progress Indicator" +
 * "Inline Failure State, Not a Phantom Step". Table-driven, pure-function,
 * zero mocks (design.md "Phase → step-index mapping").
 */
describe("resolveWizardSteps (spec: web-certify-flow)", () => {
  it("always returns exactly 5 steps, in a fixed upload/analysis/review/anchor/certified order", () => {
    const steps = resolveWizardSteps(record({ state: "DRAFT" }));

    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.id)).toEqual([
      "upload",
      "analysis",
      "review",
      "anchor",
      "certified",
    ]);
  });

  it("Scenario: Analysis complete, awaiting review shows step 3 active — DRAFT with aiSummary, no failure", () => {
    const steps = resolveWizardSteps(
      record({ state: "DRAFT", aiSummary: "Un resumen." }),
    );

    expect(steps[0]!.status).toBe("complete"); // upload
    expect(steps[1]!.status).toBe("complete"); // analysis
    expect(steps[2]!.status).toBe("current"); // review
    expect(steps[2]!.label).toBe(certifyDictionary.stepper.reviewLabel);
  });

  it("Scenario: Confirmed record shows step 4 active — READY", () => {
    const steps = resolveWizardSteps(
      record({ state: "READY", aiSummary: "Un resumen." }),
    );

    expect(steps[0]!.status).toBe("complete"); // upload
    expect(steps[1]!.status).toBe("complete"); // analysis
    expect(steps[2]!.status).toBe("complete"); // review
    expect(steps[3]!.status).toBe("current"); // anchor
  });

  it("Scenario: Anchoring shows step 4 in progress, not complete — ANCHORING", () => {
    const steps = resolveWizardSteps(
      record({ state: "ANCHORING", aiSummary: "Un resumen." }),
    );

    expect(steps[3]!.status).toBe("current");
    expect(steps[3]!.status).not.toBe("complete");
  });

  it("Scenario: Certified shows all steps complete — CERTIFIED", () => {
    const steps = resolveWizardSteps(
      record({ state: "CERTIFIED", aiSummary: "Un resumen." }),
    );

    expect(steps.map((step) => step.status)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
  });

  it("Scenario: Analysis failure renders inline on step 2 — DRAFT with analysisFailureReason, indicator still 5 steps", () => {
    const steps = resolveWizardSteps(
      record({ state: "DRAFT", analysisFailureReason: "sin capa de texto" }),
    );

    expect(steps).toHaveLength(5);
    expect(steps[1]!.status).toBe("error"); // analysis
    // The indicator itself never grows a 6th "error" step — the ids stay
    // exactly the fixed 5, only their status changes.
    expect(steps.map((step) => step.id)).toEqual([
      "upload",
      "analysis",
      "review",
      "anchor",
      "certified",
    ]);
  });

  it("Scenario: Anchor failure renders inline on step 4 — FAILED, indicator still 5 steps", () => {
    const steps = resolveWizardSteps(
      record({ state: "FAILED", aiSummary: "Un resumen." }),
    );

    expect(steps).toHaveLength(5);
    expect(steps[3]!.status).toBe("error"); // anchor
  });
});
