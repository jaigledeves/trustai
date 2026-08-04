import { Check, Circle, CircleDot, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { WizardStepInfo, WizardStepStatus } from "./wizard-step";

interface WizardStepperProps {
  steps: WizardStepInfo[];
}

const iconByStatus: Record<WizardStepStatus, ReactNode> = {
  complete: <Check className="size-4 shrink-0" aria-hidden="true" />,
  current: <CircleDot className="size-4 shrink-0" aria-hidden="true" />,
  upcoming: <Circle className="size-4 shrink-0" aria-hidden="true" />,
  error: <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />,
};

const classNameByStatus: Record<WizardStepStatus, string> = {
  complete: "border-primary/40 bg-primary/10 text-primary",
  current: "border-primary bg-primary/15 text-primary font-semibold",
  upcoming: "border-border bg-muted/30 text-muted-foreground",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

/**
 * Presentational 5-step indicator (spec: web-certify-flow — "Five-Step
 * Progress Indicator" / "Inline Failure State, Not a Phantom Step").
 * Renders exactly what `resolveWizardSteps` computes — zero business logic
 * here (design.md "Phase → step-index mapping"), so the mapping stays
 * testable as a plain function while this stays a dumb render.
 */
export function WizardStepper({ steps }: WizardStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step) => (
        <li
          key={step.id}
          data-status={step.status}
          aria-current={step.status === "current" ? "step" : undefined}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${classNameByStatus[step.status]}`}
        >
          {iconByStatus[step.status]}
          {step.label}
        </li>
      ))}
    </ol>
  );
}
