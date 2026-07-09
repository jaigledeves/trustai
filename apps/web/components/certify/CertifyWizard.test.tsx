import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trustRecordQueryKey } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { CertifyWizard } from "./CertifyWizard";

// `DiscardDraftButton` (rendered in every DRAFT branch) calls `useRouter()`,
// which throws without a mounted app router in jsdom (same approach as
// LoginForm.test.tsx).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function buildRecord(overrides: Partial<TrustRecordDetail> = {}): TrustRecordDetail {
  return {
    id: "tr-1",
    assetId: "asset-1",
    state: "DRAFT",
    canonicalHash: null,
    versionNumber: 1,
    aiSummary: null,
    aiClassification: null,
    aiLanguage: null,
    aiProvider: null,
    aiModel: null,
    aiModelVersion: null,
    reviewedByUserId: null,
    anchor: null,
    analysisFailureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderWizard(record: TrustRecordDetail) {
  // staleTime mirrors app/providers.tsx's real default so `initialData` isn't
  // treated as immediately stale (same rationale as AnchorPoller.test.tsx) —
  // the render branch here is driven by explicit setQueryData, not an
  // unmocked background refetch.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CertifyWizard id="tr-1" initialRecord={record} />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("CertifyWizard (spec: AI Analysis Display — never a silent DRAFT stall)", () => {
  it("shows an 'analizando' status (not an empty review form) while the analyze-document job is still running", () => {
    renderWizard(buildRecord({ state: "DRAFT", aiSummary: null, analysisFailureReason: null }));

    expect(
      screen.getByText("Analizando el documento… esto puede tardar unos segundos."),
    ).toBeInTheDocument();
    // The review form must NOT mount against the empty snapshot — otherwise
    // its useState would freeze an empty summary that never updates.
    expect(screen.queryByLabelText("Resumen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar certificación" })).not.toBeInTheDocument();
  });

  it("swaps to the editable review step once the poll picks up the completed summary", async () => {
    const queryClient = renderWizard(
      buildRecord({ state: "DRAFT", aiSummary: null, analysisFailureReason: null }),
    );
    expect(
      screen.getByText("Analizando el documento… esto puede tardar unos segundos."),
    ).toBeInTheDocument();

    // Simulates the poll tick TanStack Query would perform on its own once the
    // async job finishes and the record gains its AI fields.
    queryClient.setQueryData<TrustRecordDetail>(
      trustRecordQueryKey("tr-1"),
      buildRecord({
        state: "DRAFT",
        aiSummary: "Un resumen generado por IA.",
        aiClassification: "contrato",
        aiLanguage: "es",
      }),
    );

    const summary = await screen.findByLabelText("Resumen");
    expect(summary).toHaveValue("Un resumen generado por IA.");
    expect(
      screen.queryByText("Analizando el documento… esto puede tardar unos segundos."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar certificación" })).toBeInTheDocument();
  });

  it("renders the frozen canonical hash (from the shell) alongside the anchor button once READY", () => {
    renderWizard(
      buildRecord({
        state: "READY",
        canonicalHash: "a".repeat(64),
        aiSummary: "Un resumen generado por IA.",
      }),
    );

    // Frozen evidence survives the DRAFT -> READY swap because it lives in the
    // shell, not ConfirmButton (which is now unmounted in READY).
    expect(screen.getByText("Hash canónico (evidencia congelada)")).toBeInTheDocument();
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument();
    // READY offers the anchor action at the same time.
    expect(screen.getByRole("button", { name: "Anclar en blockchain" })).toBeInTheDocument();
    // Confirm is done — its button is gone.
    expect(screen.queryByRole("button", { name: "Confirmar certificación" })).not.toBeInTheDocument();
  });

  it("shows the failure banner (not a perpetual 'analizando' spinner) when analysis fails with no text layer", () => {
    renderWizard(
      buildRecord({
        state: "DRAFT",
        aiSummary: null,
        analysisFailureReason: "El PDF no tiene una capa de texto extraíble.",
      }),
    );

    expect(
      screen.queryByText("Analizando el documento… esto puede tardar unos segundos."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("El PDF no tiene una capa de texto extraíble.")).toBeInTheDocument();
  });
});
