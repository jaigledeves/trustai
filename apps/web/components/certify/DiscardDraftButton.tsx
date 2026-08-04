"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { useDiscard } from "../../lib/api/hooks/useDiscard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { StatusPanel } from "../ui/status-panel";

/**
 * Discard action (SHOULD, spec: "Discard a Draft") — only valid while
 * DRAFT. Confirms via the shared `AlertDialog` primitive (spec:
 * web-visual-coherence — "Dialog-Based Discard Confirmation"), not
 * `window.confirm()`. Trigger and in-dialog confirm use deliberately
 * distinct labels (`discard.action` vs `discard.confirmAction`) so both
 * can be queried unambiguously.
 */
export function DiscardDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const discard = useDiscard(id);
  const [error, setError] = useState<string | null>(null);

  async function handleDiscard() {
    setError(null);
    try {
      await discard.mutateAsync();
      router.push("/dtrs/new");
    } catch {
      setError(certifyDictionary.discard.errorGeneric);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <StatusPanel variant="error">{error}</StatusPanel> : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={discard.isPending}>
            {certifyDictionary.discard.action}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{certifyDictionary.discard.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {certifyDictionary.discard.confirmPrompt}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{certifyDictionary.discard.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              {certifyDictionary.discard.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
