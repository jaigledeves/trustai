"use client";

import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { ApiError, mapApiError } from "../../lib/api/errors";
import { useConfirm } from "../../lib/api/hooks/useConfirm";
import { Button } from "../ui/button";
import { StatusPanel } from "../ui/status-panel";

/**
 * Confirm step (spec: "Confirm (DRAFT -> READY)"). On success `useConfirm`
 * writes `state: READY` + `canonicalHash` into the shared query cache; the
 * wizard shell then renders the frozen hash and swaps this button out for the
 * anchor step. This component therefore only owns the action + its error
 * surface — the frozen-hash display is the shell's (it must survive the
 * DRAFT -> READY unmount).
 */
export function ConfirmButton({ id }: { id: string }) {
  const confirm = useConfirm(id);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await confirm.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapApiError(err.status, "confirm"));
      } else {
        throw err;
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <StatusPanel variant="error">{error}</StatusPanel> : null}
      {/* size="lg" — this is the wizard's primary action, ahead of Save
          (ReviewStep) and Discard in visual weight. */}
      <Button type="button" size="lg" onClick={handleConfirm} disabled={confirm.isPending}>
        {certifyDictionary.confirm.submit}
      </Button>
    </div>
  );
}
