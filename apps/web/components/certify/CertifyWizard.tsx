"use client";

import { certifyDictionary } from "../../dictionaries/es/certify";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { isAnalysisPending, resolveAnalysisRefetchInterval } from "./analysis-poll-interval";
import { AnchorPoller } from "./AnchorPoller";
import { ConfirmButton } from "./ConfirmButton";
import { DiscardDraftButton } from "./DiscardDraftButton";
import { ReviewStep } from "./ReviewStep";

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
  const { data: record } = useTrustRecord(id, {
    initialData: initialRecord,
    refetchInterval: (query) => resolveAnalysisRefetchInterval(query.state.data),
  });
  const current = record ?? initialRecord;
  const state = current.state;

  if (state === "DISCARDED") {
    return <p role="status">Este borrador fue descartado.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {showDuplicateNotice ? (
        <p role="status">{certifyDictionary.upload.duplicateNotice}</p>
      ) : null}

      {current.canonicalHash ? (
        // Frozen evidence (INV-22/24): once confirm sets it, the hash stays
        // visible through READY/ANCHORING/CERTIFIED. It lives in the shell
        // (not ConfirmButton) because confirm flips state to READY, which
        // unmounts the DRAFT branch — the hash must outlive that swap.
        <div role="status" className="flex flex-col gap-1">
          <p className="font-medium">{certifyDictionary.confirm.frozenHashLabel}</p>
          <code className="break-all">{current.canonicalHash}</code>
        </div>
      ) : null}

      {state === "DRAFT" ? (
        isAnalysisPending(current) ? (
          <>
            <p role="status">{certifyDictionary.review.analysisInProgress}</p>
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
