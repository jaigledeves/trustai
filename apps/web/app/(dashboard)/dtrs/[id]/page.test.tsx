import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../../test/msw/server";
import type { TrustRecordDetail, TrustRecordState } from "../../../../lib/api/types";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "token" }) })),
}));

// Mark the two branch targets so the route's state-driven selection can be
// asserted without mounting the client wizard (which needs a QueryClient) or
// the full detail card.
vi.mock("../../../../components/certify/CertifyWizard", () => ({
  CertifyWizard: () => <div>WIZARD_ISLAND</div>,
}));
vi.mock("../../../../components/history/DtrDetailCard", () => ({
  DtrDetailCard: () => <div>DETAIL_CARD</div>,
}));

const { default: DtrDetailPage } = await import("./page");

function buildRecord(state: TrustRecordState): TrustRecordDetail {
  return {
    id: "rec-1",
    assetId: "asset-1",
    state,
    canonicalHash: state === "DRAFT" ? null : "a".repeat(64),
    versionNumber: 1,
    aiSummary: "Resumen de la IA",
    aiClassification: "Contrato",
    aiLanguage: "es",
    aiProvider: null,
    aiModel: null,
    aiModelVersion: null,
    reviewedByUserId: null,
    anchor: null,
    analysisFailureReason: null,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  };
}

function stubRecord(record: TrustRecordDetail) {
  server.use(
    http.get(`http://localhost:3000/trust-records/${record.id}`, () =>
      HttpResponse.json(record),
    ),
  );
}

async function renderPage(id: string) {
  render(
    await DtrDetailPage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("DtrDetailPage (spec: web-history — DTR Detail View, cross-org 404)", () => {
  it("renders notFound() for a cross-org or unknown id, never a 403-style message (RNF-004)", async () => {
    server.use(
      http.get("http://localhost:3000/trust-records/other-org-id", () =>
        HttpResponse.json({ message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(
      DtrDetailPage({
        params: Promise.resolve({ id: "other-org-id" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it("renders the read-only detail card for a terminal CERTIFIED record (full timeline)", async () => {
    stubRecord(buildRecord("CERTIFIED"));

    await renderPage("rec-1");

    expect(screen.getByText("DETAIL_CARD")).toBeInTheDocument();
    expect(screen.queryByText("WIZARD_ISLAND")).not.toBeInTheDocument();
  });

  it("renders the read-only detail card for a terminal FAILED record", async () => {
    stubRecord(buildRecord("FAILED"));

    await renderPage("rec-1");

    expect(screen.getByText("DETAIL_CARD")).toBeInTheDocument();
    expect(screen.queryByText("WIZARD_ISLAND")).not.toBeInTheDocument();
  });

  it("renders the interactive certify wizard for an in-progress DRAFT record", async () => {
    stubRecord(buildRecord("DRAFT"));

    await renderPage("rec-1");

    expect(screen.getByText("WIZARD_ISLAND")).toBeInTheDocument();
    expect(screen.queryByText("DETAIL_CARD")).not.toBeInTheDocument();
  });
});
