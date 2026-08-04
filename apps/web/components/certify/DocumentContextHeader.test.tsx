import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { certifyDictionary } from "../../dictionaries/es/certify";
import type { TrustRecordAssetDetail } from "../../lib/api/types";
import { DocumentContextHeader } from "./DocumentContextHeader";

function asset(overrides: Partial<TrustRecordAssetDetail> = {}): TrustRecordAssetDetail {
  return {
    filename: "contrato.pdf",
    sizeBytes: 204_800,
    uploadedAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * spec: web-certify-flow — "Persistent Document Context". Presentational
 * only (design.md "Component decomposition") — renders filename, formatted
 * size, and upload date from a fixed `TrustRecordAssetDetail` prop.
 */
describe("DocumentContextHeader (spec: web-certify-flow — Persistent Document Context)", () => {
  it("renders the filename, a formatted size, and the upload date", () => {
    render(<DocumentContextHeader asset={asset()} />);

    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    // 204_800 bytes = 200 KB
    expect(screen.getByText(/200(\.0)? KB/)).toBeInTheDocument();
  });

  it("Scenario: Missing filename shows a fallback label — filename is null", () => {
    render(<DocumentContextHeader asset={asset({ filename: null })} />);

    expect(
      screen.getByText(certifyDictionary.documentContext.filenameFallback),
    ).toBeInTheDocument();
    expect(screen.queryByText("contrato.pdf")).not.toBeInTheDocument();
  });
});
