import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { server } from "../../test/msw/server";
import { trustRecordQueryKey } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { AnchorPoller } from "./AnchorPoller";
import {
  MAX_ANCHOR_POLL_ATTEMPTS,
  resolveAnchorRefetchInterval,
} from "./anchor-poll-interval";

function buildRecord(overrides: Partial<TrustRecordDetail> = {}): TrustRecordDetail {
  return {
    id: "tr-1",
    assetId: "asset-1",
    state: "READY",
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
    analysisFailureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPoller(record: TrustRecordDetail) {
  // staleTime mirrors app/providers.tsx's real default — without it,
  // TanStack Query treats `initialData` as immediately stale and fires an
  // unmocked background refetch on mount that has nothing to do with what
  // each test is actually proving.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AnchorPoller id="tr-1" initialRecord={record} />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("AnchorPoller (spec: Anchor Submission and Polling — highest-risk logic in this slice)", () => {
  it("Anchor submitted: shows ANCHORING immediately (non-blocking) after the submit button is clicked", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/anchor", () =>
        HttpResponse.json({ trustRecordId: "tr-1", state: "ANCHORING" }, { status: 201 }),
      ),
    );

    renderPoller(buildRecord({ state: "READY" }));
    expect(screen.getByRole("button", { name: "Anclar en blockchain" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anclar en blockchain" }));

    expect(
      await screen.findByText("Anclando en la blockchain… esto puede tardar unos minutos."),
    ).toBeInTheDocument();
  });

  it("Reaches CERTIFIED: stops polling and renders the tx hash link to the explorer", async () => {
    const queryClient = renderPoller(buildRecord({ state: "ANCHORING" }));
    expect(
      screen.getByText("Anclando en la blockchain… esto puede tardar unos minutos."),
    ).toBeInTheDocument();

    // Simulates the poll tick TanStack Query would perform on its own —
    // proves the render branch reacts correctly to the cache transition
    // without depending on real interval timing in the test.
    queryClient.setQueryData<TrustRecordDetail>(
      trustRecordQueryKey("tr-1"),
      buildRecord({
        state: "CERTIFIED",
        anchor: { txHash: "0xabc123", blockTimestamp: "2026-01-02T00:00:00.000Z", status: "CONFIRMED" },
      }),
    );

    expect(
      await screen.findByText("¡Documento certificado! Podés inspeccionar la transacción on-chain."),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ver transacción en el explorador" });
    expect(link).toHaveAttribute("href", "https://sepolia.basescan.org/tx/0xabc123");
    // No submit/anchor button should reappear once certified.
    expect(screen.queryByRole("button", { name: "Anclar en blockchain" })).not.toBeInTheDocument();
  });

  it("Transitions through FAILED: shows a transient 'reintentando automáticamente' status (NOT a dead terminal alert) with NO retry button (RF-033)", async () => {
    const queryClient = renderPoller(buildRecord({ state: "ANCHORING" }));

    // FAILED is transient — the backend re-enqueues FAILED->ANCHORING, so the
    // UI must present it as an in-progress retry, never a dead end.
    queryClient.setQueryData<TrustRecordDetail>(
      trustRecordQueryKey("tr-1"),
      buildRecord({ state: "FAILED" }),
    );

    const status = await screen.findByText(
      "El anclaje no se confirmó en el tiempo previsto y se está reintentando automáticamente. No hace falta que hagas nada.",
    );
    expect(status).toBeInTheDocument();
    // Transient status, not a dead terminal alert.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Still no manual retry button — retries are the backend's job.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("counts ONLY real poll fetches toward the give-up cap — setQueryData cache writes (Anchor clicks / hydration) never advance it; real polls eventually stop polling and show 'slow'", async () => {
    const anchoringMessage = "Anclando en la blockchain… esto puede tardar unos minutos.";
    server.use(
      http.get("http://localhost:3000/api/backend/trust-records/tr-1", () =>
        HttpResponse.json(buildRecord({ state: "ANCHORING" })),
      ),
    );
    const queryClient = renderPoller(buildRecord({ state: "ANCHORING" }));

    // Walk right up to the edge with genuine poll fetches (each is a real
    // `queryFn` run, exactly what an interval tick does).
    await act(async () => {
      for (let i = 0; i < MAX_ANCHOR_POLL_ATTEMPTS - 1; i += 1) {
        await queryClient.refetchQueries({ queryKey: trustRecordQueryKey("tr-1") });
      }
    });
    expect(screen.getByText(anchoringMessage)).toBeInTheDocument();
    expect(screen.queryByText(certifyDictionary.anchor.slowMessage)).not.toBeInTheDocument();

    // A flurry of cache writes — what `useAnchor.onSuccess` / focus rehydration
    // do — bumps `dataUpdatedAt` but is NOT a poll, so it must NOT tip us over
    // the cap. (The OLD `dataUpdatedAt` counter would trip 'slow' right here.)
    await act(async () => {
      for (let i = 0; i < 5; i += 1) {
        queryClient.setQueryData<TrustRecordDetail>(
          trustRecordQueryKey("tr-1"),
          buildRecord({ state: "ANCHORING" }),
        );
      }
    });
    expect(screen.getByText(anchoringMessage)).toBeInTheDocument();
    expect(screen.queryByText(certifyDictionary.anchor.slowMessage)).not.toBeInTheDocument();

    // One more REAL poll reaches the cap: polling stops and 'slow' is surfaced.
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: trustRecordQueryKey("tr-1") });
    });
    expect(await screen.findByText(certifyDictionary.anchor.slowMessage)).toBeInTheDocument();
    // Pure resolver mirror: at the cap the interval is `false` (polling stops).
    expect(resolveAnchorRefetchInterval("ANCHORING", MAX_ANCHOR_POLL_ATTEMPTS)).toBe(false);
  });
});
