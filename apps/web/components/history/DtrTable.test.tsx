import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { historyDictionary } from "../../dictionaries/es/history";
import { DtrTable } from "./DtrTable";

describe("DtrTable (spec: web-history — Org-Scoped DTR List)", () => {
  it("renders document, classification, state, and creation date per row when records exist", () => {
    render(
      <DtrTable
        total={2}
        items={[
          {
            id: "tr-1",
            state: "CERTIFIED",
            filename: "doc1.pdf",
            aiClassification: "Contrato",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "tr-2",
            state: "DRAFT",
            filename: null,
            aiClassification: null,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "doc1.pdf" })).toHaveAttribute(
      "href",
      "/dtrs/tr-1",
    );
    expect(screen.getByText("Contrato")).toBeInTheDocument();
    expect(screen.getByText("Certificado")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("links the document cell with the filename instead of the raw id (spec: web-visual-coherence)", () => {
    render(
      <DtrTable
        total={1}
        items={[
          {
            id: "tr-1",
            state: "CERTIFIED",
            filename: "informe-anual.pdf",
            aiClassification: "Informe",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
      />,
    );

    const link = screen.getByRole("link", { name: "informe-anual.pdf" });
    expect(link).toHaveAttribute("href", "/dtrs/tr-1");
    expect(screen.queryByText("tr-1")).not.toBeInTheDocument();
  });

  it("falls back to the truncated id as the document link when filename is null", () => {
    render(
      <DtrTable
        total={1}
        items={[
          {
            id: "tr-2",
            state: "DRAFT",
            filename: null,
            aiClassification: null,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "tr-2" })).toHaveAttribute(
      "href",
      "/dtrs/tr-2",
    );
  });

  it("renders a muted placeholder when a record has no AI classification yet", () => {
    render(
      <DtrTable
        total={1}
        items={[
          {
            id: "tr-2",
            state: "DRAFT",
            filename: "borrador.pdf",
            aiClassification: null,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(historyDictionary.list.classificationPending),
    ).toBeInTheDocument();
  });

  it("renders the empty-state message instead of a table when the org has zero trust records", () => {
    render(<DtrTable total={0} items={[]} />);

    expect(
      screen.getByText("Todavía no certificaste ningún documento."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a create-DTR CTA linking to /dtrs/new alongside the empty-state message (spec: web-visual-coherence — History Navigation Affordances)", () => {
    render(<DtrTable total={0} items={[]} />);

    expect(
      screen.getByRole("link", { name: historyDictionary.list.emptyStateCta }),
    ).toHaveAttribute("href", "/dtrs/new");
  });

  it("shows the no-matches message (not the onboarding CTA) when a filter is active and nothing matches (spec: web-dtr-list — Distinct Empty States)", () => {
    render(<DtrTable total={0} items={[]} hasActiveFilter />);

    expect(screen.getByText(historyDictionary.list.noMatches)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: historyDictionary.list.emptyStateCta }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(historyDictionary.list.emptyState)).not.toBeInTheDocument();
  });

  it("shows the onboarding CTA (not the no-matches message) when the org is truly empty", () => {
    render(<DtrTable total={0} items={[]} hasActiveFilter={false} />);

    expect(screen.getByText(historyDictionary.list.emptyState)).toBeInTheDocument();
    expect(screen.queryByText(historyDictionary.list.noMatches)).not.toBeInTheDocument();
  });
});
