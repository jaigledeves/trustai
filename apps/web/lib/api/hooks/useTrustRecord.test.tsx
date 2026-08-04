import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../test/msw/server";
import type { TrustRecordDetail } from "../types";
import { trustRecordQueryKey, useTrustRecord } from "./useTrustRecord";

function buildRecord(overrides: Partial<TrustRecordDetail> = {}): TrustRecordDetail {
  return {
    id: "tr-1",
    assetId: "asset-1",
    state: "ANCHORING",
    canonicalHash: "a".repeat(64),
    versionNumber: 1,
    aiSummary: "resumen",
    aiClassification: "contrato",
    aiLanguage: "es",
    aiProvider: "stub",
    aiModel: "stub-deterministic",
    aiModelVersion: "1.0.0",
    reviewedByUserId: "user-1",
    anchor: null,
    asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
    analysisFailureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Deliberately mirrors app/providers.tsx: `staleTime` is set, but `retry` and
 * `refetchOnWindowFocus` are LEFT AT TANSTACK DEFAULTS (retry: 3,
 * refetchOnWindowFocus: true). This proves the hook pins its own per-query
 * `retry: false` / `refetchOnWindowFocus: false` rather than relying on the
 * app client to override them.
 */
function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useTrustRecord (shared polling hook — poll-cap correctness)", () => {
  it("disables retry so ONE failing poll tick runs queryFn/onFetch exactly once (not up to 4 under the client's default retry: 3)", async () => {
    server.use(
      http.get("http://localhost:3000/api/backend/trust-records/tr-1", () =>
        HttpResponse.json({ status: 500, message: "backend down" }, { status: 500 }),
      ),
    );
    const onFetch = vi.fn();
    const queryClient = makeClient();

    renderHook(
      () =>
        useTrustRecord("tr-1", {
          initialData: buildRecord({ state: "ANCHORING" }),
          onFetch,
        }),
      { wrapper: wrapperFor(queryClient) },
    );

    // One scheduled poll tick that fails at the network. `refetchQueries`
    // resolves only after the retryer is done, so any client-default retries
    // would already have re-run queryFn (and onFetch) before this awaits out.
    await queryClient.refetchQueries({ queryKey: trustRecordQueryKey("tr-1") });

    expect(onFetch).toHaveBeenCalledTimes(1);
  });

  it("pins retry: false and refetchOnWindowFocus: false on the query for every consumer, so the 'we stopped auto-updating' copy stays truthful (no off-interval focus refetch)", () => {
    const queryClient = makeClient();

    renderHook(
      () => useTrustRecord("tr-1", { initialData: buildRecord({ state: "ANCHORING" }) }),
      { wrapper: wrapperFor(queryClient) },
    );

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: trustRecordQueryKey("tr-1") });
    const observedOptions = query?.observers[0]?.options;

    expect(observedOptions?.retry).toBe(false);
    expect(observedOptions?.refetchOnWindowFocus).toBe(false);
  });
});
