"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { useDiscard } from "../../lib/api/hooks/useDiscard";
import { Button } from "../ui/button";

/** Discard action (SHOULD, spec: "Discard a Draft") — only valid while DRAFT. */
export function DiscardDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const discard = useDiscard(id);
  const [error, setError] = useState<string | null>(null);

  async function handleDiscard() {
    setError(null);
    const confirmed = window.confirm(certifyDictionary.discard.confirmPrompt);
    if (!confirmed) {
      return;
    }

    try {
      await discard.mutateAsync();
      router.push("/dtrs/new");
    } catch {
      setError(certifyDictionary.discard.errorGeneric);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p role="alert">{error}</p> : null}
      <Button
        type="button"
        variant="destructive"
        onClick={handleDiscard}
        disabled={discard.isPending}
      >
        {certifyDictionary.discard.action}
      </Button>
    </div>
  );
}
