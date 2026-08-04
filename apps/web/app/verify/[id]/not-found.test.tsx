import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { shellDictionary } from "../../../dictionaries/es/shell";
import Layout from "./layout";
import NotFound from "./not-found";

describe("verify/[id] not-found fallback (spec: web-visual-coherence — Decision 7, header persists)", () => {
  it("renders the recovery message and a link back to / under the persistent layout header", () => {
    render(
      <Layout>
        <NotFound />
      </Layout>,
    );

    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeInTheDocument();
    expect(screen.getByText(shellDictionary.errors.notFound)).toBeInTheDocument();

    const homeLinks = screen.getAllByRole("link", { name: /trust\s*ai/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of homeLinks) {
      expect(link).toHaveAttribute("href", "/");
    }
  });
});
