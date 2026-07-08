import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { ConfirmTrustRecordResponse, TrustRecordDetail } from "../types";
import { trustRecordQueryKey } from "./useTrustRecord";

/**
 * `canonicalHash` is frozen evidence (INV-22/24) — written straight into
 * the query cache on success so the UI never has to re-fetch to display
 * it, and never risks a stale re-render showing a null hash.
 */
export function useConfirm(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      clientFetch<ConfirmTrustRecordResponse>(`/trust-records/${id}/confirm`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<TrustRecordDetail>(trustRecordQueryKey(id), (old) =>
        old ? { ...old, state: "READY", canonicalHash: data.canonicalHash } : old,
      );
    },
  });
}
