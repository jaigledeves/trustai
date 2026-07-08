import { useQuery } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { TrustRecordDetail } from "../types";

export function trustRecordQueryKey(id: string) {
  return ["trust-record", id] as const;
}

export interface UseTrustRecordOptions {
  /** `3000` while `state === "ANCHORING"` (AnchorPoller), `false` otherwise. */
  refetchInterval?: number | false;
  /** RSC-fetched detail, seeded in so the wizard shell never flashes a loading state. */
  initialData?: TrustRecordDetail;
}

export function useTrustRecord(id: string, options: UseTrustRecordOptions = {}) {
  return useQuery({
    queryKey: trustRecordQueryKey(id),
    queryFn: () => clientFetch<TrustRecordDetail>(`/trust-records/${id}`),
    refetchInterval: options.refetchInterval ?? false,
    ...(options.initialData !== undefined ? { initialData: options.initialData } : {}),
  });
}
