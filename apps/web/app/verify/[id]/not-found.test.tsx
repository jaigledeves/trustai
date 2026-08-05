import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { verifyDictionary } from "../../../dictionaries/es/verify";
import Layout from "./layout";
import NotFound from "./not-found";

describe("verify/[id] not-found fallback (spec: web-visual-coherence — Decision 7, header persists; web-public-verify — Helpful Empty/Not-Found States)", () => {
  it("renders link-specific not-found copy (verifyDictionary.notFound) and a recovery link back to / under the persistent layout header", () => {
    render(
      <Layout>
        <NotFound />
      </Layout>,
    );

    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.notFound.title)).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.notFound.description)).toBeInTheDocument();

    const recoveryLink = screen.getByRole("link", {
      name: verifyDictionary.notFound.homeLinkLabel,
    });
    expect(recoveryLink).toHaveAttribute("href", "/");

    // Layout's persistent brand wordmark link also points home.
    const brandLinks = screen.getAllByRole("link", { name: /trust\s*ai/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute("href", "/");
    }
  });
});
