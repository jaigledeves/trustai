"use client";

import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { ApiError, mapApiError } from "../../lib/api/errors";
import { useConfirm } from "../../lib/api/hooks/useConfirm";
import { Button } from "../ui/button";

/** Confirm step (spec: "Confirm (DRAFT -> READY)"). */
export function ConfirmButton({ id }: { id: string }) {
  const confirm = useConfirm(id);
  const [error, setError] = useState<string | null>(null);
  const [canonicalHash, setCanonicalHash] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const result = await confirm.mutateAsync();
      setCanonicalHash(result.canonicalHash);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapApiError(err.status, "confirm"));
      } else {
        throw err;
      }
    }
  }

  if (canonicalHash) {
    return (
      <div role="status" className="flex flex-col gap-1">
        <p className="font-medium">{certifyDictionary.confirm.frozenHashLabel}</p>
        <code className="break-all">{canonicalHash}</code>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p role="alert">{error}</p> : null}
      <Button type="button" onClick={handleConfirm} disabled={confirm.isPending}>
        {certifyDictionary.confirm.submit}
      </Button>
    </div>
  );
}
