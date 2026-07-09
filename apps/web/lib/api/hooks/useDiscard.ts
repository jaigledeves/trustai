import { useMutation } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";

/** `POST /discard` returns 204 — the caller navigates back to the upload step on success. */
export function useDiscard(id: string) {
  return useMutation({
    mutationFn: () =>
      clientFetch<void>(`/trust-records/${id}/discard`, { method: "POST" }),
  });
}
