import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { server } from "../../test/msw/server";
import { HashOnlyCard } from "./HashOnlyCard";

const BASE_URL = "http://localhost:3000";

describe("HashOnlyCard (spec: web-public-verify — Hash-Only Card Without Analysis, INV-41)", () => {
  it("renders verdict + legal.disclaimer from verifyDictionary, never the server's explanation/disclaimer strings, with no AI analysis field anywhere on screen", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/rec-1`, () =>
        HttpResponse.json({
          verdict: "VALID",
          documentIntegrity: true,
          chainAnchor: {
            anchored: true,
            txHash: "0xabc123",
            blockTimestamp: "2026-07-09T00:00:00.000Z",
            explorerUrl: "https://sepolia.basescan.org/tx/0xabc123",
            chainReadUnavailable: false,
          },
          explanation: "SERVER_EXPLANATION_SHOULD_NOT_RENDER",
          disclaimer: "SERVER_DISCLAIMER_SHOULD_NOT_RENDER",
          verifiedAt: "2026-07-09T12:30:00.000Z",
        }),
      ),
    );

    const jsx = await HashOnlyCard({ id: "rec-1" });
    render(jsx);

    expect(screen.getByText("Válido")).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.verdicts.VALID.message)).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.legal.disclaimerLabel)).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.legal.disclaimer)).toBeInTheDocument();
    // Web-owned copy (spec: "Web-Owned Verdict & Legal Copy") — server strings never render.
    expect(screen.queryByText("SERVER_EXPLANATION_SHOULD_NOT_RENDER")).not.toBeInTheDocument();
    expect(screen.queryByText("SERVER_DISCLAIMER_SHOULD_NOT_RENDER")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver transacción en el explorador" })).toHaveAttribute(
      "href",
      "https://sepolia.basescan.org/tx/0xabc123",
    );
    // INV-41: the DTO structurally has no AI analysis field — nothing to accidentally render.
    expect(screen.queryByText(/Resumen|Clasificación|Idioma/)).not.toBeInTheDocument();
  });

  it("renders notFound() for an unknown id on GET (never a silent empty card)", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/unknown-id`, () =>
        HttpResponse.json({ message: "Trust record not found" }, { status: 404 }),
      ),
    );

    await expect(HashOnlyCard({ id: "unknown-id" })).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
