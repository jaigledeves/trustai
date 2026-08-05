import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDictionary } from "../../dictionaries/es/verify";
import type { VerifyUploadResponse } from "../../lib/api/types";

const postVerifyUploadMock = vi.fn<(id: string, file: File) => Promise<VerifyUploadResponse>>();
vi.mock("../../lib/api/public-verify-client", () => ({
  postVerifyUpload: (id: string, file: File) => postVerifyUploadMock(id, file),
}));
// ClientHashRecompute has its own dedicated test suite (5.4) — mocked here
// so this suite isolates the 4-way verdict branch, the highest-risk logic
// in this task (design.md).
vi.mock("./ClientHashRecompute", () => ({
  ClientHashRecompute: () => <div>CLIENT_HASH_RECOMPUTE</div>,
}));

const { UploadVerdictPanel } = await import("./UploadVerdictPanel");

function pdfFile(name = "doc.pdf") {
  return new File(["%PDF-1.4 fake bytes"], name, { type: "application/pdf" });
}

function baseResult(overrides: Partial<VerifyUploadResponse>): VerifyUploadResponse {
  return {
    verdict: "VALID",
    documentIntegrity: true,
    chainAnchor: null,
    explanation: "server explanation",
    disclaimer: "server disclaimer",
    verifiedAt: "2026-07-09T00:00:00.000Z",
    analysis: null,
    ...overrides,
  };
}

async function uploadAndSubmit(response: VerifyUploadResponse) {
  postVerifyUploadMock.mockResolvedValueOnce(response);
  const user = userEvent.setup();
  render(<UploadVerdictPanel id="rec-1" />);
  await user.upload(screen.getByLabelText("Elige el archivo a verificar"), pdfFile());
  await user.click(screen.getByRole("button", { name: "Verificar documento" }));
}

describe("UploadVerdictPanel (spec: web-public-verify — Upload Verdict, All Four States)", () => {
  afterEach(() => {
    postVerifyUploadMock.mockClear();
  });

  it("VALID: renders the success verdict with analysis and the anchor tx link, alongside the recompute panel", async () => {
    await uploadAndSubmit(
      baseResult({
        verdict: "VALID",
        analysis: { summary: "Resumen X", classification: "Contrato", language: "es" },
        chainAnchor: {
          anchored: true,
          txHash: "0xabc",
          blockTimestamp: "2026-07-09T00:00:00.000Z",
          explorerUrl: "https://sepolia.basescan.org/tx/0xabc",
          chainReadUnavailable: false,
        },
      }),
    );

    expect(await screen.findByText("Válido")).toBeInTheDocument();
    expect(screen.getByText("Resumen X")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver transacción en el explorador" })).toHaveAttribute(
      "href",
      "https://sepolia.basescan.org/tx/0xabc",
    );
    expect(screen.getByText("CLIENT_HASH_RECOMPUTE")).toBeInTheDocument();
  });

  it("ASSET_MISMATCH: renders the exact spec-quoted mismatch message, with no analysis rendered", async () => {
    await uploadAndSubmit(baseResult({ verdict: "ASSET_MISMATCH", analysis: null, chainAnchor: null }));

    expect(
      await screen.findByText(verifyDictionary.verdicts.ASSET_MISMATCH.message),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Resumen:/)).not.toBeInTheDocument();
  });

  it("PENDING_ANCHOR: renders a partial verdict explaining anchoring is in progress, with analysis present", async () => {
    await uploadAndSubmit(
      baseResult({
        verdict: "PENDING_ANCHOR",
        analysis: { summary: "Resumen Y", classification: "Factura", language: "es" },
      }),
    );

    expect(await screen.findByText("Anclaje pendiente")).toBeInTheDocument();
    expect(screen.getByText("Resumen Y")).toBeInTheDocument();
  });

  it("clears the previous file's recompute panel when a new file is selected after a verdict (no stale hash)", async () => {
    await uploadAndSubmit(baseResult({ verdict: "VALID" }));

    // The recompute panel is mounted for the submitted file after a verdict.
    expect(await screen.findByText("CLIENT_HASH_RECOMPUTE")).toBeInTheDocument();

    // Selecting a new file before re-submitting must unmount the OLD file's
    // recompute panel instead of leaving the previous file's hash on screen.
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Elige el archivo a verificar"), pdfFile("new.pdf"));

    expect(screen.queryByText("CLIENT_HASH_RECOMPUTE")).not.toBeInTheDocument();
  });

  it("INVALID_RECORD via POST on unknown id: renders as an error state — the UI never expected a 404 here", async () => {
    await uploadAndSubmit(baseResult({ verdict: "INVALID_RECORD", analysis: null, chainAnchor: null }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(verifyDictionary.verdicts.INVALID_RECORD.message);
  });

  it("shows the filename and file size after selection via the file picker", async () => {
    const user = userEvent.setup();
    render(<UploadVerdictPanel id="rec-1" />);
    const input = screen.getByLabelText("Elige el archivo a verificar");
    const file = new File(["x".repeat(1536)], "contrato.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Tamaño:/)).toBeInTheDocument();
  });

  it("accepts a file via drag-and-drop and shows the filename", () => {
    render(<UploadVerdictPanel id="rec-1" />);
    // The input is a sibling of the label (not a child), so closest("label")
    // returns null. Query the label directly via its for/id association.
    const dropzone = document.querySelector('label[for="verify-upload-file"]') as HTMLElement;
    const droppedFile = new File(["content"], "verified.pdf", { type: "application/pdf" });

    fireEvent.drop(dropzone, { dataTransfer: { files: [droppedFile] } });

    expect(screen.getByText("verified.pdf")).toBeInTheDocument();
  });

  it("applies drag-over visual feedback on dragenter and removes it on dragleave", () => {
    render(<UploadVerdictPanel id="rec-1" />);
    const dropzone = document.querySelector('label[for="verify-upload-file"]') as HTMLElement;

    fireEvent.dragEnter(dropzone);
    expect(dropzone.classList.contains("border-primary")).toBe(true);

    // Simulate leaving the zone boundary (relatedTarget outside the label).
    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });
    expect(dropzone.classList.contains("border-primary")).toBe(false);
  });
});
