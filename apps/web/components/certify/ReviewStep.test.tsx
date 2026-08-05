import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { useTrustRecord } from "../../lib/api/hooks/useTrustRecord";
import type { TrustRecordDetail } from "../../lib/api/types";
import { ReviewStep } from "./ReviewStep";

/**
 * In the real wizard shell, the PARENT component (CertifyWizard, task 3.9)
 * is the sole active observer of `useTrustRecord(id)` — ReviewStep only
 * mutates. `invalidateQueries` only triggers a background refetch for
 * ACTIVELY OBSERVED queries, so this test-only sibling stands in for that
 * parent subscription to prove the invalidation-on-settle behavior for
 * real, instead of asserting on a query with zero observers.
 */
function TrustRecordObserver({ id }: { id: string }) {
  useTrustRecord(id);
  return null;
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function buildRecord(overrides: Partial<TrustRecordDetail> = {}): TrustRecordDetail {
  return {
    id: "tr-1",
    assetId: "asset-1",
    state: "DRAFT",
    canonicalHash: null,
    versionNumber: 1,
    aiSummary: "Un resumen generado por IA.",
    aiClassification: "contrato",
    aiLanguage: "es",
    aiProvider: "stub",
    aiModel: "stub-deterministic",
    aiModelVersion: "1.0.0",
    reviewedByUserId: null,
    anchor: null,
    asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
    analysisFailureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ReviewStep (spec: AI Analysis Display + Review Edit)", () => {
  it("renders aiSummary/aiClassification/aiLanguage editable when analysis succeeded", () => {
    renderWithQueryClient(<ReviewStep id="tr-1" record={buildRecord()} />);

    expect(screen.getByLabelText("Resumen")).toHaveValue("Un resumen generado por IA.");
    expect(screen.getByLabelText("Clasificación")).toHaveValue("contrato");
    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
  });

  it("renders a non-dismissible failure banner (no edit form) when aiSummary is null and a failure reason exists — localized, never the raw API string (RNF-041)", () => {
    renderWithQueryClient(
      <ReviewStep
        id="tr-1"
        record={buildRecord({
          aiSummary: null,
          analysisFailureReason:
            "PDF has no extractable text layer (scanned PDFs are not supported in MVP — no OCR)",
        })}
      />,
    );

    expect(screen.getByText("No pudimos analizar este documento")).toBeInTheDocument();
    expect(
      screen.getByText(
        "El documento no tiene texto extraíble. Por ahora solo se admiten PDFs con texto, no imágenes escaneadas.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no extractable text layer/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Resumen")).not.toBeInTheDocument();
  });

  it("localizes the 'returned no content' known API failure to the dedicated Spanish message", () => {
    renderWithQueryClient(
      <ReviewStep
        id="tr-1"
        record={buildRecord({
          aiSummary: null,
          analysisFailureReason: "OpenAI returned no content for the analysis request",
        })}
      />,
    );

    expect(
      screen.getByText(
        "El proveedor de IA no devolvió contenido para este documento. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
  });

  it("falls back to the generic Spanish message for an unrecognized/dynamic failure reason — never renders the raw string", () => {
    renderWithQueryClient(
      <ReviewStep
        id="tr-1"
        record={buildRecord({
          aiSummary: null,
          analysisFailureReason:
            "AI provider returned schema-invalid analysis: summary: Required",
        })}
      />,
    );

    expect(screen.getByText("No se pudo analizar el documento.")).toBeInTheDocument();
    expect(screen.queryByText(/schema-invalid/i)).not.toBeInTheDocument();
  });

  it("submits only the changed field(s) to PATCH .../review and shows a saved confirmation after 204", async () => {
    const user = userEvent.setup();
    let receivedBody: unknown = null;
    server.use(
      http.patch(
        "http://localhost:3000/api/backend/trust-records/tr-1/review",
        async ({ request }) => {
          receivedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
      http.get("http://localhost:3000/api/backend/trust-records/tr-1", () =>
        HttpResponse.json(buildRecord({ aiSummary: "Resumen editado por el revisor." })),
      ),
    );

    renderWithQueryClient(<ReviewStep id="tr-1" record={buildRecord()} />);
    const summaryField = screen.getByLabelText("Resumen");
    await user.clear(summaryField);
    await user.type(summaryField, "Resumen editado por el revisor.");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(receivedBody).toEqual({ summary: "Resumen editado por el revisor." });
  });

  it("shows the edit-conflict message and refreshes instead of showing the failed edit as applied on 409 (INV-21)", async () => {
    const user = userEvent.setup();
    let getCallCount = 0;
    server.use(
      http.patch("http://localhost:3000/api/backend/trust-records/tr-1/review", () =>
        HttpResponse.json({ status: 409, message: "conflict" }, { status: 409 }),
      ),
      http.get("http://localhost:3000/api/backend/trust-records/tr-1", () => {
        getCallCount += 1;
        return HttpResponse.json(buildRecord({ state: "READY" }));
      }),
    );

    renderWithQueryClient(
      <>
        <TrustRecordObserver id="tr-1" />
        <ReviewStep id="tr-1" record={buildRecord()} />
      </>,
    );
    // Let the observer's initial mount fetch settle before triggering the
    // edit — otherwise its call would be indistinguishable from the
    // post-409 refetch we actually want to prove happened.
    await vi.waitFor(() => expect(getCallCount).toBe(1));

    const summaryField = screen.getByLabelText("Resumen");
    await user.clear(summaryField);
    await user.type(summaryField, "Un intento de edición tardío.");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(
        "El estado del documento cambió mientras editabas. Actualizamos la vista con los datos más recientes.",
      ),
    ).toBeInTheDocument();
    await vi.waitFor(() => expect(getCallCount).toBe(2));
  });
});
