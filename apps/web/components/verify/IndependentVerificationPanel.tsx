"use client";

import { Check, Download, Minus, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useId, useState, type ChangeEvent } from "react";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { getProofPackage, proofPackageDownloadUrl } from "../../lib/api/public-verify-client";
import { config } from "../../lib/config";
import { truncateId } from "../../lib/format";
import { cn } from "../../lib/utils";
import {
  runIndependentVerification,
  type IndependentVerificationResult,
  type StepFact,
  type StepStatus,
  type VerificationOutcome,
  type VerificationStep,
} from "../../lib/verify/independent-verification";
import { VERDICT_SEVERITY_STYLES, type VerdictSeverity } from "../../lib/verify/verdict";
import { Button } from "../ui/button";

interface IndependentVerificationPanelProps {
  id: string;
}

const t = verifyDictionary.independent;

/** Outcome -> the shared verdict severity tokens (ADR-014). */
const OUTCOME_SEVERITY: Record<VerificationOutcome, VerdictSeverity> = {
  verified: "success",
  legacy: "pending",
  unavailable: "pending",
  failed: "error",
  not_found: "error",
};

const STEP_STATUS_STYLES: Record<StepStatus, { Icon: LucideIcon; badge: string; text: string }> = {
  ok: { Icon: Check, badge: "bg-success/10 text-success", text: "text-success" },
  failed: { Icon: X, badge: "bg-destructive/10 text-destructive", text: "text-destructive" },
  skipped: { Icon: Minus, badge: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
};

/**
 * Independent verification view (roadmap C2/C4): the visitor picks the
 * original file and the browser runs `runIndependentVerification`, which
 * downloads the public proof (ADR-016), recomputes the hashes with dtr-core
 * and reads the AnchorRegistry contract over a public RPC. Each step is shown
 * with its inputs and result, so the outcome does not rest on Ancrux's word.
 *
 * viem is loaded lazily (`chain-reader`) when the check runs, keeping it out
 * of the page's initial bundle.
 */
export function IndependentVerificationPanel({ id }: IndependentVerificationPanelProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IndependentVerificationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError(false);
  }

  async function handleRun() {
    if (!file) return;
    setIsRunning(true);
    setResult(null);
    setError(false);
    try {
      const { createViemChainReader } = await import("../../lib/verify/chain-reader");
      const outcome = await runIndependentVerification(
        { trustRecordId: id, file },
        { fetchProof: getProofPackage, chain: createViemChainReader(config.chainRpcUrl) },
      );
      setResult(outcome);
    } catch {
      // The orchestrator never throws; this covers a failed lazy chunk load.
      setError(true);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 sm:p-8">
      <h2 className="text-lg font-semibold">{t.panelTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{t.panelDescription}</p>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t.fileLabel}
        </label>
        <input
          id={inputId}
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" size="lg" onClick={handleRun} disabled={!file || isRunning}>
          {isRunning ? t.runningLabel : t.submitLabel}
        </Button>
        <a
          href={proofPackageDownloadUrl(id)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          <Download className="size-4" aria-hidden="true" />
          {t.downloadProofLabel}
        </a>
      </div>

      <div aria-live="polite">
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t.errorGeneric}
          </p>
        ) : null}
        {result ? <VerificationReport result={result} /> : null}
      </div>
    </section>
  );
}

function VerificationReport({ result }: { result: IndependentVerificationResult }) {
  const titleId = useId();
  const copy = t.outcomes[result.outcome];
  const { role, className, Icon } = VERDICT_SEVERITY_STYLES[OUTCOME_SEVERITY[result.outcome]];

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
      <ol aria-label={t.stepsLabel} className="flex flex-col gap-3">
        {result.steps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}
      </ol>
      <div role={role} aria-labelledby={titleId} className={cn("rounded-xl p-4", className)}>
        <div className="flex items-center gap-2">
          <Icon className="size-5" aria-hidden="true" />
          <h3 id={titleId} className="font-semibold">
            {copy.title}
          </h3>
        </div>
        <p className="mt-1 text-sm">{copy.message}</p>
      </div>
    </div>
  );
}

function StepItem({ step }: { step: VerificationStep }) {
  const { Icon, badge, text } = STEP_STATUS_STYLES[step.status];

  return (
    <li className="flex gap-3 rounded-xl border border-border p-3 text-sm">
      <span
        aria-hidden="true"
        className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", badge)}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium">{t.steps[step.id]}</span>
          <span className={cn("text-xs font-medium", text)}>
            {t.status[step.status]}
          </span>
        </p>
        <p className="text-muted-foreground text-pretty">{t.codes[step.code]}</p>
        {step.facts.length > 0 ? (
          <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            {step.facts.map((fact) => (
              <FactRow key={fact.key} fact={fact} />
            ))}
          </dl>
        ) : null}
        {step.warning ? (
          <p className="mt-1 flex items-start gap-1.5 text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t.warnings[step.warning]}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function FactRow({ fact }: { fact: StepFact }) {
  return (
    <>
      <dt className="text-muted-foreground">{t.facts[fact.key]}</dt>
      <dd className="min-w-0">
        {fact.mono ? (
          <code
            title={fact.value}
            aria-label={fact.value}
            className="font-mono text-xs text-card-foreground"
          >
            {truncateId(fact.value)}
          </code>
        ) : (
          <span className="break-all">{fact.value}</span>
        )}
      </dd>
    </>
  );
}
