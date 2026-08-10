import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { glossaryDictionary } from "../../dictionaries/es/glossary";
import { server } from "../../test/msw/server";
import { trustRecordQueryKey } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { CertifyWizard } from "./CertifyWizard";
import {
  MAX_ANALYSIS_POLL_ATTEMPTS,
  resolveAnalysisRefetchInterval,
} from "./analysis-poll-interval";

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
    asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
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
    expect(screen.getByText("Huella del registro")).toBeInTheDocument();
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument();
    // READY offers the anchor action at the same time.
    expect(screen.getByRole("button", { name: "Finalizar certificación" })).toBeInTheDocument();
    // Scenario: "Document context renders in every phase" — the anchor phase too.
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText(certifyDictionary.stepper.anchorLabel)).toBeInTheDocument();
    // Confirm is done — its button is gone.
    expect(screen.queryByRole("button", { name: "Confirmar certificación" })).not.toBeInTheDocument();
  });

  it("Scenario: Disclosure reveals the technical explanation on demand — the frozen-hash label stays static and the disclosure body is hidden until activated", async () => {
    const user = userEvent.setup();
    renderWizard(
      buildRecord({
        state: "READY",
        canonicalHash: "a".repeat(64),
        aiSummary: "Un resumen generado por IA.",
      }),
    );

    // The disclosure trigger is present; the native <details> starts closed.
    const trigger = screen.getByText(certifyDictionary.confirm.frozenHashDisclosureLabel);
    const details = trigger.closest("details");
    expect(details).not.toHaveAttribute("open");

    await user.click(trigger);

    expect(details).toHaveAttribute("open");
    expect(
      screen.getByText(certifyDictionary.confirm.frozenHashDisclosure),
    ).toBeInTheDocument();
  });

  it("shows the failure banner (not a perpetual 'analizando' spinner) when analysis fails with no text layer — localized, never the raw API string (RNF-041)", () => {
    renderWizard(
      buildRecord({
        state: "DRAFT",
        aiSummary: null,
        analysisFailureReason:
          "PDF has no extractable text layer (scanned PDFs are not supported in MVP — no OCR)",
      }),
    );

    expect(
      screen.queryByText("Analizando el documento… esto puede tardar unos segundos."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "El documento no tiene texto extraíble. Por ahora solo se admiten PDFs con texto, no imágenes escaneadas.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no extractable text layer/i)).not.toBeInTheDocument();
    // Scenario: "Document context renders in every phase" — the error phase too.
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
  });

  it("does NOT render a dead-end ConfirmButton on a failed-analysis DRAFT (confirm would 409) — only the banner + discard", () => {
    renderWizard(
      buildRecord({
        state: "DRAFT",
        aiSummary: null,
        analysisFailureReason:
          "PDF has no extractable text layer (scanned PDFs are not supported in MVP — no OCR)",
      }),
    );

    // The primary action must be absent — it could only ever fail here.
    expect(
      screen.queryByRole("button", { name: "Confirmar certificación" }),
    ).not.toBeInTheDocument();
    // Discard remains the sole available action out of the failed state.
    expect(screen.getByRole("button", { name: "Descartar borrador" })).toBeInTheDocument();
  });

  it("renders the discarded message from the dictionary (RNF-041 — no inline JSX literal) for a DISCARDED record", () => {
    renderWizard(buildRecord({ state: "DISCARDED" }));

    expect(screen.getByText("Este borrador fue descartado.")).toBeInTheDocument();
  });

  it("counts ONLY real poll fetches toward the analysis give-up cap — setQueryData cache writes never advance it; real polls eventually surface the slow state", async () => {
    const analyzingMessage = "Analizando el documento… esto puede tardar unos segundos.";
    const pending = () =>
      buildRecord({ state: "DRAFT", aiSummary: null, analysisFailureReason: null });
    server.use(
      http.get("http://localhost:3000/api/backend/trust-records/tr-1", () =>
        HttpResponse.json(pending()),
      ),
    );
    const queryClient = renderWizard(pending());
    expect(screen.getByText(analyzingMessage)).toBeInTheDocument();

    // Walk up to the edge with genuine poll fetches.
    await act(async () => {
      for (let i = 0; i < MAX_ANALYSIS_POLL_ATTEMPTS - 1; i += 1) {
        await queryClient.refetchQueries({ queryKey: trustRecordQueryKey("tr-1") });
      }
    });
    expect(screen.getByText(analyzingMessage)).toBeInTheDocument();
    expect(screen.queryByText(certifyDictionary.review.analysisSlow)).not.toBeInTheDocument();

    // Cache writes bump `dataUpdatedAt` without any poll — the OLD counter would
    // trip the "tardando más" state right here; the fetch-based one must not.
    await act(async () => {
      for (let i = 0; i < 5; i += 1) {
        queryClient.setQueryData<TrustRecordDetail>(trustRecordQueryKey("tr-1"), pending());
      }
    });
    expect(screen.getByText(analyzingMessage)).toBeInTheDocument();
    expect(screen.queryByText(certifyDictionary.review.analysisSlow)).not.toBeInTheDocument();

    // One more REAL poll reaches the cap: the slow state is surfaced.
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: trustRecordQueryKey("tr-1") });
    });
    expect(await screen.findByText(certifyDictionary.review.analysisSlow)).toBeInTheDocument();
    expect(resolveAnalysisRefetchInterval(pending(), MAX_ANALYSIS_POLL_ATTEMPTS)).toBe(false);
  });
});

describe("CertifyWizard (spec: web-plain-language — Plain-Language Framing for Unavoidable Terms)", () => {
  it("pairs the anchoring status message with a QuickHelp explanation for 'anclar'", async () => {
    const user = userEvent.setup();
    renderWizard(buildRecord({ state: "ANCHORING", aiSummary: "Un resumen." }));

    expect(screen.getByText(certifyDictionary.anchor.anchoringMessage)).toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: glossaryDictionary.anclar.term });
    await user.click(trigger);

    expect(screen.getByText(glossaryDictionary.anclar.definition)).toBeInTheDocument();
  });
});

describe("CertifyWizard (spec: web-certify-flow — Persistent Back Navigation)", () => {
  it("shows a usable link to /dtrs in the DRAFT phase", () => {
    renderWizard(buildRecord({ state: "DRAFT", aiSummary: "Un resumen." }));

    const backLinks = screen.getAllByRole("link", {
      name: certifyDictionary.navigation.backToList,
    });
    expect(backLinks.some((link) => link.getAttribute("href") === "/dtrs")).toBe(true);
  });

  it("Scenario: Back navigation is available while anchoring — ANCHORING", () => {
    renderWizard(buildRecord({ state: "ANCHORING", aiSummary: "Un resumen." }));

    const backLinks = screen.getAllByRole("link", {
      name: certifyDictionary.navigation.backToList,
    });
    expect(backLinks.some((link) => link.getAttribute("href") === "/dtrs")).toBe(true);
  });
});

describe("CertifyWizard (spec: web-certify-flow — Persistent Document Context + Five-Step Progress Indicator)", () => {
  it("renders the document context header and the 5-step indicator above the DRAFT branch", () => {
    renderWizard(
      buildRecord({
        state: "DRAFT",
        aiSummary: null,
        analysisFailureReason: null,
        asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
      }),
    );

    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText(certifyDictionary.stepper.reviewLabel)).toBeInTheDocument();
    expect(screen.getByText(certifyDictionary.stepper.anchorLabel)).toBeInTheDocument();
  });

  it("Scenario: Document context renders in every phase — including DISCARDED (error/anchor/certified are covered by AnchorPoller.test.tsx)", () => {
    renderWizard(
      buildRecord({
        state: "DISCARDED",
        asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
      }),
    );

    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText(certifyDictionary.stepper.certifiedLabel)).toBeInTheDocument();
  });

  it("Scenario: Missing filename shows a fallback label — DRAFT with a legacy asset (filename null)", () => {
    renderWizard(
      buildRecord({
        state: "DRAFT",
        asset: { filename: null, sizeBytes: 1024, uploadedAt: "2026-01-01T00:00:00.000Z" },
      }),
    );

    expect(
      screen.getByText(certifyDictionary.documentContext.filenameFallback),
    ).toBeInTheDocument();
  });
});

describe("CertifyWizard (spec: web-certify-flow — Terminal-State Exit CTAs, DISCARDED)", () => {
  it("Scenario: Discarded state offers recovery actions — 'certify another' (-> /dtrs/new) and 'back to /dtrs'", () => {
    renderWizard(buildRecord({ state: "DISCARDED" }));

    expect(screen.getByText(certifyDictionary.discard.discardedMessage)).toBeInTheDocument();

    const certifyAnother = screen.getByRole("link", {
      name: certifyDictionary.discard.certifyAnotherAction,
    });
    expect(certifyAnother).toHaveAttribute("href", "/dtrs/new");

    const backToList = screen.getAllByRole("link", {
      name: certifyDictionary.discard.backToListAction,
    });
    expect(backToList.some((link) => link.getAttribute("href") === "/dtrs")).toBe(true);
  });
});
