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
  /**
   * Fires once per REAL fetch (each `queryFn` execution). Pollers use this to
   * count actual API polls for their give-up cap — unlike `dataUpdatedAt`,
   * which is also bumped by `initialData` hydration and `setQueryData` cache
   * writes (e.g. `useAnchor.onSuccess`), neither of which is a poll.
   */
  onFetch?: () => void;
}

export function useTrustRecord(id: string, options: UseTrustRecordOptions = {}) {
  return useQuery({
    queryKey: trustRecordQueryKey(id),
    queryFn: () => {
      options.onFetch?.();
      return clientFetch<TrustRecordDetail>(`/trust-records/${id}`);
    },
    refetchInterval: options.refetchInterval ?? false,
    // ONE scheduled poll tick must equal exactly one `queryFn`/`onFetch` run:
    // the `refetchInterval` IS the retry mechanism here, so client-side retry
    // (TanStack default 3, not overridden in app/providers.tsx) would otherwise
    // re-run `queryFn` up to 4x per tick on a transient failure and exhaust the
    // pollers' give-up cap far faster than the intended window during an outage.
    retry: false,
    // The pollers' cap-reached copy states auto-updating has stopped; with the
    // default `refetchOnWindowFocus: true` a tab focus would still refetch stale
    // data (and fire `onFetch`), contradicting that copy. Pin it off for every
    // consumer of this shared hook.
    refetchOnWindowFocus: false,
    ...(options.initialData !== undefined ? { initialData: options.initialData } : {}),
  });
}
