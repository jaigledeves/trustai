import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { glossaryDictionary } from "../../dictionaries/es/glossary";
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
    // Plain-language summary + network note are visible by default (spec:
    // web-public-verify — "Plain-Language Summary Visible by Default").
    expect(screen.getByText(verifyDictionary.legal.disclaimerSummary)).toBeInTheDocument();
    expect(screen.getByText(verifyDictionary.legal.networkNote)).toBeInTheDocument();
    // The full legal text stays one interaction away, behind a native
    // <details>/<summary> disclosure — present but not visible by default
    // (native <details> content stays in the DOM, hidden via the UA
    // stylesheet, unlike our fully-controlled QuickHelp).
    expect(screen.getByText(verifyDictionary.legal.disclaimer)).not.toBeVisible();
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

  it("Scenario: Full legal text is one interaction away — activating the disclosure trigger reveals legal.disclaimer", async () => {
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
    const user = userEvent.setup();

    expect(screen.getByText(verifyDictionary.legal.disclaimer)).not.toBeVisible();

    await user.click(screen.getByText(verifyDictionary.legal.disclaimerFullLabel));

    expect(screen.getByText(verifyDictionary.legal.disclaimer)).toBeVisible();
  });

  it("pairs the pilot test-network mention with a QuickHelp explanation (spec: web-plain-language — Plain-Language Framing for Unavoidable Terms)", async () => {
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
          verifiedAt: "2026-07-09T12:30:00.000Z",
        }),
      ),
    );

    const jsx = await HashOnlyCard({ id: "rec-1" });
    render(jsx);
    const user = userEvent.setup();

    const trigger = screen.getByRole("button", { name: glossaryDictionary.redDePrueba.title });
    await user.click(trigger);

    expect(screen.getByText(glossaryDictionary.redDePrueba.definition)).toBeInTheDocument();
  });

  it("Honesty bug guard (spec: web-public-verify — HashOnlyCard's PENDING_ANCHOR title never reads as success): PENDING_ANCHOR title is text-warning, VALID is text-success, error is text-destructive", async () => {
    server.use(
      http.get(`${BASE_URL}/public/verify/rec-1`, () =>
        HttpResponse.json({
          verdict: "PENDING_ANCHOR",
          documentIntegrity: true,
          chainAnchor: null,
          explanation: "server explanation",
          disclaimer: "server disclaimer",
          verifiedAt: "2026-07-09T12:30:00.000Z",
        }),
      ),
    );

    const pendingJsx = await HashOnlyCard({ id: "rec-1" });
    const { unmount } = render(pendingJsx);
    const pendingTitle = screen.getByText(verifyDictionary.verdicts.PENDING_ANCHOR.title);
    expect(pendingTitle.className).not.toMatch(/text-success/);
    expect(pendingTitle.className).not.toMatch(/text-destructive/);
    expect(pendingTitle.className).toMatch(/text-warning/);
    unmount();

    server.use(
      http.get(`${BASE_URL}/public/verify/rec-2`, () =>
        HttpResponse.json({
          verdict: "VALID",
          documentIntegrity: true,
          chainAnchor: null,
          explanation: "server explanation",
          disclaimer: "server disclaimer",
          verifiedAt: "2026-07-09T12:30:00.000Z",
        }),
      ),
    );

    const validJsx = await HashOnlyCard({ id: "rec-2" });
    const { unmount: unmountValid } = render(validJsx);
    const validTitle = screen.getByText(verifyDictionary.verdicts.VALID.title);
    expect(validTitle.className).toMatch(/text-success/);
    unmountValid();

    server.use(
      http.get(`${BASE_URL}/public/verify/rec-3`, () =>
        HttpResponse.json({
          verdict: "ASSET_MISMATCH",
          documentIntegrity: false,
          chainAnchor: null,
          explanation: "server explanation",
          disclaimer: "server disclaimer",
          verifiedAt: "2026-07-09T12:30:00.000Z",
        }),
      ),
    );

    const errorJsx = await HashOnlyCard({ id: "rec-3" });
    render(errorJsx);
    const errorTitle = screen.getByText(verifyDictionary.verdicts.ASSET_MISMATCH.title);
    expect(errorTitle.className).toMatch(/text-destructive/);
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
