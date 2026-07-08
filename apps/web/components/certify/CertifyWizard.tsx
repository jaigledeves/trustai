"use client";

import { certifyDictionary } from "../../dictionaries/es/certify";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
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
 */
export function CertifyWizard({ id, initialRecord, showDuplicateNotice }: CertifyWizardProps) {
  const { data: record } = useTrustRecord(id, { initialData: initialRecord });
  const state = record?.state ?? initialRecord.state;
  const current = record ?? initialRecord;

  if (state === "DISCARDED") {
    return <p role="status">Este borrador fue descartado.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {showDuplicateNotice ? (
        <p role="status">{certifyDictionary.upload.duplicateNotice}</p>
      ) : null}

      {state === "DRAFT" ? (
        <>
          <ReviewStep id={id} record={current} />
          <ConfirmButton id={id} />
          <DiscardDraftButton id={id} />
        </>
      ) : (
        <AnchorPoller id={id} initialRecord={current} />
      )}
    </div>
  );
}
