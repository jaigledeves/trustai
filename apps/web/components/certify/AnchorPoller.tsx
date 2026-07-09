"use client";

import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { config } from "../../lib/config";
import { ApiError, mapApiError } from "../../lib/api/errors";
import { useAnchor } from "../../lib/api/hooks/useAnchor";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { Button } from "../ui/button";
import {
  MAX_ANCHOR_POLL_ATTEMPTS,
  resolveAnchorRefetchInterval,
} from "./anchor-poll-interval";

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
 * `resolveAnchorRefetchInterval` (pure, unit-tested). Only `CERTIFIED` is
 * terminal; `FAILED` is transient (the backend auto-retries FAILED->ANCHORING),
 * so it renders a "reintentando" status and keeps polling (RF-033: retries
 * are a backend/worker concern — no manual retry button).
 */
export function AnchorPoller({ id, initialRecord }: AnchorPollerProps) {
  const anchorMutation = useAnchor(id);
  const [error, setError] = useState<string | null>(null);
  // Count ONLY real poll fetches, not `dataUpdatedAt` bumps: `initialData`
  // hydration (phantom attempt #1) and `useAnchor.onSuccess`'s `setQueryData`
  // write both stamp `dataUpdatedAt` without any API poll, so counting those
  // could trip the give-up cap on non-poll cache writes. `onFetch` fires inside
  // the query's `queryFn`, so it advances once per actual poll and nothing else.
  const [pollAttempts, setPollAttempts] = useState(0);

  const { data } = useTrustRecord(id, {
    initialData: initialRecord,
    onFetch: () => setPollAttempts((n) => n + 1),
    refetchInterval: (query) =>
      resolveAnchorRefetchInterval(query.state.data?.state, pollAttempts),
  });

  const state = data?.state ?? initialRecord.state;
  // Mirrors the pure resolver's give-up condition so the UI can surface a
  // distinct "slow" state once we stop polling a job that never resolved.
  const pollCapReached = pollAttempts >= MAX_ANCHOR_POLL_ATTEMPTS;

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
    if (pollCapReached) {
      return <p role="status">{certifyDictionary.anchor.slowMessage}</p>;
    }
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
    // FAILED is transient, not terminal: the backend immediately transitions
    // FAILED->ANCHORING and re-enqueues (confirm-anchor.handler). So this is a
    // "reintentando automáticamente" status (role="status"), NOT a dead
    // role="alert" — the poller keeps running to advance to CERTIFIED. If the
    // attempt cap was reached, surface the distinct "slow" state instead.
    if (pollCapReached) {
      return <p role="status">{certifyDictionary.anchor.slowMessage}</p>;
    }
    return <p role="status">{certifyDictionary.anchor.retryingMessage}</p>;
  }

  return null;
}
