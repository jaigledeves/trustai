import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDictionary } from "../../dictionaries/es/verify";
import type {
  IndependentVerificationResult,
  VerificationStep,
} from "../../lib/verify/independent-verification";

const runMock = vi.fn<(...args: unknown[]) => Promise<IndependentVerificationResult>>();
vi.mock("../../lib/verify/independent-verification", () => ({
  runIndependentVerification: (...args: unknown[]) => runMock(...args),
}));
vi.mock("../../lib/verify/chain-reader", () => ({
  createViemChainReader: () => ({}),
}));

const { IndependentVerificationPanel } = await import("./IndependentVerificationPanel");

const t = verifyDictionary.independent;
const ANCHOR_HASH = "9f8c2d775d90c88594687f16ba2652fae2ffc184d5f77881ca01e14331eee0c9";

function skipped(id: VerificationStep["id"]): VerificationStep {
  return { id, status: "skipped", code: "skipped", facts: [] };
}

async function pickAndRun() {
  const user = userEvent.setup();
  render(<IndependentVerificationPanel id="rec-1" />);
  await user.upload(
    screen.getByLabelText(t.fileLabel),
    new File(["%PDF-1.7"], "doc.pdf", { type: "application/pdf" }),
  );
  await user.click(screen.getByRole("button", { name: t.submitLabel }));
}

describe("IndependentVerificationPanel", () => {
  afterEach(() => {
    runMock.mockReset();
  });

  it("explains it does not depend on Ancrux and links the proof download", () => {
    render(<IndependentVerificationPanel id="rec-1" />);

    expect(screen.getByText(t.panelDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.downloadProofLabel })).toHaveAttribute(
      "href",
      "http://localhost:3000/public/verify/rec-1/proof?download=1",
    );
  });

  it("renders every step in order with its state, facts and the verified outcome", async () => {
    runMock.mockResolvedValueOnce({
      outcome: "verified",
      steps: [
        {
          id: "file",
          status: "ok",
          code: "file_pdf",
          facts: [{ key: "mimeType", value: "application/pdf" }],
        },
        { id: "proof", status: "ok", code: "proof_ok", facts: [] },
        { id: "coreHash", status: "ok", code: "core_match", facts: [] },
        {
          id: "anchorHash",
          status: "ok",
          code: "anchor_hash_match",
          facts: [{ key: "anchorHash", value: ANCHOR_HASH, mono: true }],
        },
        { id: "network", status: "ok", code: "network_match", facts: [] },
        { id: "contract", status: "ok", code: "contract_known", facts: [] },
        {
          id: "anchored",
          status: "ok",
          code: "anchored",
          facts: [],
          warning: "timestamp_mismatch",
        },
      ],
    });

    await pickAndRun();

    const list = await screen.findByRole("list", { name: t.stepsLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent(t.steps.file);
    expect(items[0]).toHaveTextContent(t.status.ok);
    expect(items[0]).toHaveTextContent("application/pdf");
    expect(items[6]).toHaveTextContent(t.steps.anchored);
    expect(items[6]).toHaveTextContent(t.warnings.timestamp_mismatch);

    const hash = within(items[3]!).getByTitle(ANCHOR_HASH);
    expect(hash).toHaveClass("font-mono");
    expect(hash).not.toHaveTextContent(ANCHOR_HASH);

    expect(screen.getByRole("status", { name: t.outcomes.verified.title })).toHaveTextContent(
      t.outcomes.verified.message,
    );
    expect(runMock).toHaveBeenCalledWith(
      expect.objectContaining({ trustRecordId: "rec-1" }),
      expect.anything(),
    );
  });

  it("shows a failed step and the failed outcome as an alert", async () => {
    runMock.mockResolvedValueOnce({
      outcome: "failed",
      steps: [
        { id: "file", status: "ok", code: "file_pdf", facts: [] },
        { id: "proof", status: "ok", code: "proof_ok", facts: [] },
        { id: "coreHash", status: "ok", code: "core_match", facts: [] },
        { id: "anchorHash", status: "ok", code: "anchor_hash_match", facts: [] },
        { id: "network", status: "failed", code: "rpc_error", facts: [] },
        skipped("contract"),
        skipped("anchored"),
      ],
    });

    await pickAndRun();

    const list = await screen.findByRole("list", { name: t.stepsLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items[4]).toHaveTextContent(t.status.failed);
    expect(items[4]).toHaveTextContent(t.codes.rpc_error);
    expect(items[5]).toHaveTextContent(t.status.skipped);
    expect(screen.getByRole("alert", { name: t.outcomes.failed.title })).toBeInTheDocument();
  });

  it("shows the legacy message for a dtr-1 record", async () => {
    runMock.mockResolvedValueOnce({
      outcome: "legacy",
      steps: [
        { id: "file", status: "ok", code: "file_pdf", facts: [] },
        { id: "proof", status: "skipped", code: "proof_legacy", facts: [] },
        skipped("coreHash"),
        skipped("anchorHash"),
        skipped("network"),
        skipped("contract"),
        skipped("anchored"),
      ],
    });

    await pickAndRun();

    expect(await screen.findByRole("status", { name: t.outcomes.legacy.title })).toHaveTextContent(
      t.outcomes.legacy.message,
    );
    expect(screen.getByText(t.codes.proof_legacy)).toBeInTheDocument();
  });

  it("shows a generic error if the run rejects unexpectedly", async () => {
    runMock.mockRejectedValueOnce(new Error("boom"));

    await pickAndRun();

    expect(await screen.findByText(t.errorGeneric)).toBeInTheDocument();
  });
});
