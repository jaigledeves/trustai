import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { AnchorTrustRecordResponse, TrustRecordDetail } from "../types";
import { trustRecordQueryKey } from "./useTrustRecord";

/**
 * `POST /anchor` responds `ANCHORING` immediately (non-blocking, RF-032).
 * Writing that into the query cache on success — rather than waiting for
 * `AnchorPoller`'s next poll tick — is what makes the state change visible
 * "immediately" as the spec requires.
 */
export function useAnchor(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      clientFetch<AnchorTrustRecordResponse>(`/trust-records/${id}/anchor`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.setQueryData<TrustRecordDetail>(trustRecordQueryKey(id), (old) =>
        old ? { ...old, state: "ANCHORING" } : old,
      );
    },
  });
}
