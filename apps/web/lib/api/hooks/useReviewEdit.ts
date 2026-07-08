import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { ReviewEditPatch } from "../types";
import { trustRecordQueryKey } from "./useTrustRecord";

/**
 * `PATCH /trust-records/:id/review` returns 204 (no body) — the spec
 * requires refetching the detail afterward rather than optimistically
 * applying the patch client-side (a 409 mid-edit must never look like it
 * succeeded).
 */
export function useReviewEdit(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ReviewEditPatch) =>
      clientFetch<void>(`/trust-records/${id}/review`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trustRecordQueryKey(id) });
    },
  });
}
