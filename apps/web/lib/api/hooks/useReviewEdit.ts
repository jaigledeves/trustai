import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { ReviewEditPatch } from "../types";
import { trustRecordQueryKey } from "./useTrustRecord";

/**
 * `PATCH /trust-records/:id/review` returns 204 (no body) — the spec
 * requires refetching the detail afterward rather than optimistically
 * applying the patch client-side. Refetches on BOTH success and failure:
 * a 409 (INV-21 — record left DRAFT mid-edit) must refresh the view to the
 * server's real current state, never leave the UI looking like the failed
 * edit was applied.
 */
export function useReviewEdit(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ReviewEditPatch) =>
      clientFetch<void>(`/trust-records/${id}/review`, {
        method: "PATCH",
        body: patch,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: trustRecordQueryKey(id) });
    },
  });
}
