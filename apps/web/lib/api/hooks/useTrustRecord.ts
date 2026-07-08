import { useQuery, type Query } from "@tanstack/react-query";
import { clientFetch } from "../client-fetch";
import type { TrustRecordDetail } from "../types";

export function trustRecordQueryKey(id: string) {
  return ["trust-record", id] as const;
}

type TrustRecordQuery = Query<
  TrustRecordDetail,
  Error,
  TrustRecordDetail,
  readonly ["trust-record", string]
>;

/**
 * The function form is what `AnchorPoller` actually uses — it lets
 * TanStack Query re-evaluate "should we still be polling?" against the
 * LATEST fetched data on every tick, not a value captured once at mount
 * (see TanStack Query v5's `refetchInterval` callback signature).
 */
type RefetchIntervalOption =
  | number
  | false
  | ((query: TrustRecordQuery) => number | false | undefined);

export interface UseTrustRecordOptions {
  /** `3000` while `state === "ANCHORING"` (AnchorPoller), `false` otherwise. */
  refetchInterval?: RefetchIntervalOption;
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
