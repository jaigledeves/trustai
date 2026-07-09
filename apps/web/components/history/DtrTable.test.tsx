import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DtrTable } from "./DtrTable";

describe("DtrTable (spec: web-history — Org-Scoped DTR List)", () => {
  it("renders id, state, and creation date per row when records exist", () => {
    render(
      <DtrTable
        total={2}
        items={[
          {
            id: "tr-1",
            state: "CERTIFIED",
            filename: "doc1.pdf",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "tr-2",
            state: "DRAFT",
            filename: null,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tr-1" })).toHaveAttribute(
      "href",
      "/dtrs/tr-1",
    );
    expect(screen.getByText("Certificado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tr-2" })).toHaveAttribute(
      "href",
      "/dtrs/tr-2",
    );
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("renders the empty-state message instead of a table when the org has zero trust records", () => {
    render(<DtrTable total={0} items={[]} />);

    expect(
      screen.getByText("Todavía no certificaste ningún documento."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
