"use client";

import Link from "next/link";
import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { Button } from "../ui/button";
import { StatusPanel } from "../ui/status-panel";
import {
  MAX_ANALYSIS_POLL_ATTEMPTS,
  isAnalysisPending,
  resolveAnalysisRefetchInterval,
} from "./analysis-poll-interval";
import { AnchorPoller } from "./AnchorPoller";
import { ConfirmButton } from "./ConfirmButton";
import { DiscardDraftButton } from "./DiscardDraftButton";
import { DocumentContextHeader } from "./DocumentContextHeader";
import { hasAnalysisFailed, ReviewStep } from "./ReviewStep";
import { resolveWizardSteps } from "./wizard-step";
import { WizardStepper } from "./WizardStepper";

interface CertifyWizardProps {
  id: string;
  initialRecord: TrustRecordDetail;
  showDuplicateNotice?: boolean;
}

/**
 * State-driven wizard shell (spec: web-certify-wizard). The sole active
 * subscriber of `useTrustRecord(id)` for the whole wizard — every step
 * component below only mutates; this component re-renders and swaps steps
 * the moment any mutation's `onSuccess`/`onSettled` updates the shared
 * query cache (confirm -> READY, anchor -> ANCHORING, poll -> CERTIFIED/FAILED).
 *
 * It also owns the async-analysis poll: `POST /assets` enqueues the
 * analyze-document job rather than running it synchronously, so a freshly
 * uploaded record is DRAFT with no `aiSummary` yet. Polling here (via
 * `resolveAnalysisRefetchInterval`) fills that gap and only mounts
 * `ReviewStep` once analysis resolves — otherwise the reviewer would land on
 * a review form frozen against an empty snapshot (a silent DRAFT stall the
 * spec explicitly forbids).
 */
export function CertifyWizard({ id, initialRecord, showDuplicateNotice }: CertifyWizardProps) {
  // Count ONLY real poll fetches, not `dataUpdatedAt` bumps: `initialData`
  // hydration and any `setQueryData` cache write also stamp `dataUpdatedAt`
  // without an API poll, so counting those could trip the give-up cap without a
  // real poll. `onFetch` fires inside the query's `queryFn` — once per poll.
  const [analysisPollAttempts, setAnalysisPollAttempts] = useState(0);
  const { data: record } = useTrustRecord(id, {
    initialData: initialRecord,
    onFetch: () => setAnalysisPollAttempts((n) => n + 1),
    refetchInterval: (query) =>
      resolveAnalysisRefetchInterval(query.state.data, analysisPollAttempts),
  });

  const current = record ?? initialRecord;
  const state = current.state;
  const analysisPollCapReached = analysisPollAttempts >= MAX_ANALYSIS_POLL_ATTEMPTS;

  return (
    <div className="flex flex-col gap-6">
      {/* Persistent back navigation (spec: web-certify-flow — "Persistent
          Back Navigation") — rendered above every branch, including
          DISCARDED and ANCHORING, unlike the old per-branch early return. */}
      <Link
        href="/dtrs"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {certifyDictionary.navigation.backToList}
      </Link>

      {/* Persistent document context (spec: web-certify-flow — "Persistent
          Document Context") + 5-step progress indicator (spec: "Five-Step
          Progress Indicator") — both render unconditionally above the
          phase branch below, in every state. */}
      <DocumentContextHeader asset={current.asset} />
      <WizardStepper steps={resolveWizardSteps(current)} />

      {showDuplicateNotice ? (
        <StatusPanel variant="info">{certifyDictionary.upload.duplicateNotice}</StatusPanel>
      ) : null}

      {current.canonicalHash ? (
        // Frozen evidence (INV-22/24): once confirm sets it, the hash stays
        // visible through READY/ANCHORING/CERTIFIED. It lives in the shell
        // (not ConfirmButton) because confirm flips state to READY, which
        // unmounts the DRAFT branch — the hash must outlive that swap.
        <div role="status" className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {certifyDictionary.confirm.frozenHashLabel}
          </p>
          <code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
            {current.canonicalHash}
          </code>
        </div>
      ) : null}

      {state === "DISCARDED" ? (
        // spec: "Terminal-State Exit CTAs" — DISCARDED must offer "certify
        // another" (-> /dtrs/new) and "back to /dtrs", never zero exits.
        <>
          <StatusPanel variant="info">{certifyDictionary.discard.discardedMessage}</StatusPanel>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dtrs/new">{certifyDictionary.discard.certifyAnotherAction}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dtrs">{certifyDictionary.discard.backToListAction}</Link>
            </Button>
          </div>
        </>
      ) : state === "DRAFT" ? (
        isAnalysisPending(current) ? (
          <>
            <StatusPanel variant={analysisPollCapReached ? "info" : "pending"}>
              {analysisPollCapReached
                ? certifyDictionary.review.analysisSlow
                : certifyDictionary.review.analysisInProgress}
            </StatusPanel>
            <DiscardDraftButton id={id} />
          </>
        ) : hasAnalysisFailed(current) ? (
          // Analysis FAILED: confirm would 409 against incomplete analysis,
          // so render ONLY the failure banner + discard — never a dead-end
          // ConfirmButton whose primary action can only fail.
          <>
            <ReviewStep id={id} record={current} />
            <DiscardDraftButton id={id} />
          </>
        ) : (
          <>
            <ReviewStep id={id} record={current} />
            <ConfirmButton id={id} />
            <DiscardDraftButton id={id} />
          </>
        )
      ) : (
        <AnchorPoller id={id} initialRecord={current} />
      )}
    </div>
  );
}
