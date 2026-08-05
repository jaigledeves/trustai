import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TrustRecordDetail } from "../../lib/api/types";
import { DtrDetailCard } from "./DtrDetailCard";

function baseRecord(overrides: Partial<TrustRecordDetail> = {}): TrustRecordDetail {
  return {
    id: "tr-1",
    assetId: "a-1",
    state: "CERTIFIED",
    canonicalHash: "a".repeat(64),
    versionNumber: 1,
    aiSummary: "Resumen generado por IA",
    aiClassification: "Contrato",
    aiLanguage: "es",
    aiProvider: "openai",
    aiModel: "gpt-4",
    aiModelVersion: "1",
    reviewedByUserId: "u-1",
    anchor: {
      txHash: "0xabc123",
      blockTimestamp: "2026-01-01T00:00:00.000Z",
      status: "CONFIRMED",
    },
    asset: { filename: "contrato.pdf", sizeBytes: 204_800, uploadedAt: "2026-01-01T00:00:00.000Z" },
    analysisFailureReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("DtrDetailCard (spec: web-history — DTR Detail View)", () => {
  it("renders state, canonicalHash, AI fields, and the anchor tx link when all are present (spec: 'Detail renders full timeline')", () => {
    render(<DtrDetailCard record={baseRecord()} />);

    expect(screen.getByText("Certificado")).toBeInTheDocument();
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument();
    expect(screen.getByText("Resumen generado por IA")).toBeInTheDocument();
    expect(screen.getByText("Contrato")).toBeInTheDocument();
    expect(screen.getByText("es")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Ver transacción en el explorador" });
    expect(link.getAttribute("href")).toContain("0xabc123");

    // A CERTIFIED record exposes the shareable public-verification block:
    // the absolute /verify/:id link and its QR code.
    const verifyLink = screen.getByRole("link", {
      name: "Abrir verificación pública",
    });
    expect(verifyLink.getAttribute("href")).toBe(
      "http://localhost:3100/verify/tr-1",
    );
    expect(
      screen.getByTitle("Código QR de verificación pública"),
    ).toBeInTheDocument();

    // Back-link into the history list (spec: web-visual-coherence —
    // "History Navigation Affordances", "Detail view links back to the
    // list"). Reuses the existing shellDictionary.nav.dtrs label.
    expect(screen.getByRole("link", { name: "Mis DTR" })).toHaveAttribute(
      "href",
      "/dtrs",
    );
  });

  it("renders pending copy instead of a hash/AI/anchor value for a fresh DRAFT record with none of them yet", () => {
    render(
      <DtrDetailCard
        record={baseRecord({
          state: "DRAFT",
          canonicalHash: null,
          aiSummary: null,
          aiClassification: null,
          aiLanguage: null,
          anchor: null,
        })}
      />,
    );

    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no se generó (el documento no fue confirmado)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El análisis de IA todavía no está disponible."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Este documento todavía no fue registrado."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver transacción en el explorador" }),
    ).not.toBeInTheDocument();

    // The public-verification share/QR only appears once CERTIFIED.
    expect(
      screen.queryByRole("link", { name: "Abrir verificación pública" }),
    ).not.toBeInTheDocument();
  });
});
