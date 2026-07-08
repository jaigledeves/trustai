"use client";

import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { config } from "../../lib/config";
import { ApiError, mapApiError } from "../../lib/api/errors";
import { useAnchor } from "../../lib/api/hooks/useAnchor";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { Button } from "../ui/button";
import { resolveAnchorRefetchInterval } from "./anchor-poll-interval";

interface AnchorPollerProps {
  id: string;
  initialRecord: TrustRecordDetail;
}

/**
 * Anchor step + poller (spec: "Anchor Submission and Polling") — the
 * highest-risk logic in this slice. Submitting (`READY` -> `ANCHORING`) is
 * non-blocking: `useAnchor`'s `onSuccess` writes `ANCHORING` straight into
 * the query cache, so this component reflects it on the very next render,
 * before any poll tick. Polling itself starts/stops via
 * `resolveAnchorRefetchInterval` (pure, unit-tested) — `CERTIFIED`/`FAILED`
 * are terminal, no retry button (RF-033: retries are a backend/worker concern).
 */
export function AnchorPoller({ id, initialRecord }: AnchorPollerProps) {
  const anchorMutation = useAnchor(id);
  const [error, setError] = useState<string | null>(null);

  const { data } = useTrustRecord(id, {
    initialData: initialRecord,
    refetchInterval: (query) => resolveAnchorRefetchInterval(query.state.data?.state),
  });
  const state = data?.state ?? initialRecord.state;

  async function handleAnchor() {
    setError(null);
    try {
      await anchorMutation.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapApiError(err.status, "anchor"));
      } else {
        throw err;
      }
    }
  }

  if (state === "READY") {
    return (
      <div className="flex flex-col gap-2">
        {error ? <p role="alert">{error}</p> : null}
        <Button type="button" onClick={handleAnchor} disabled={anchorMutation.isPending}>
          {certifyDictionary.anchor.submit}
        </Button>
      </div>
    );
  }

  if (state === "ANCHORING") {
    return <p role="status">{certifyDictionary.anchor.anchoringMessage}</p>;
  }

  if (state === "CERTIFIED") {
    const txHash = data?.anchor?.txHash;
    const explorerUrl = txHash ? `${config.chainExplorerBaseUrl}/tx/${txHash}` : null;
    return (
      <div role="status" className="flex flex-col gap-2">
        <p>{certifyDictionary.anchor.certifiedMessage}</p>
        {explorerUrl ? (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            {certifyDictionary.anchor.explorerLinkLabel}
          </a>
        ) : null}
      </div>
    );
  }

  if (state === "FAILED") {
    // No retry button by design (RF-033) — retries are automatic/backend.
    return <p role="alert">{certifyDictionary.anchor.failedMessage}</p>;
  }

  return null;
}
