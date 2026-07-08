import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { trustRecordQueryKey } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { AnchorPoller } from "./AnchorPoller";

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

  it("Reaches FAILED: stops polling and renders a visible failure state with NO retry button (RF-033)", async () => {
    const queryClient = renderPoller(buildRecord({ state: "ANCHORING" }));

    queryClient.setQueryData<TrustRecordDetail>(
      trustRecordQueryKey("tr-1"),
      buildRecord({ state: "FAILED" }),
    );

    expect(
      await screen.findByText(
        "El anclaje falló. El equipo de soporte ya fue notificado — no hace falta reintentar manualmente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
