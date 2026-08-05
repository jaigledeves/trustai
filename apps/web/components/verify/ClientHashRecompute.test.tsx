import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDictionary } from "../../dictionaries/es/verify";

const sha256HexMock = vi.fn<(data: string | Uint8Array) => Promise<string>>();
vi.mock("@trustai/dtr-core", () => ({
  sha256Hex: (data: string | Uint8Array) => sha256HexMock(data),
}));

afterEach(() => {
  sha256HexMock.mockClear();
});

const { ClientHashRecompute } = await import("./ClientHashRecompute");

/**
 * jsdom's `File` doesn't implement `arrayBuffer()` (unlike real browsers) —
 * this polyfills exactly that one missing method for the test, without
 * changing production code (which correctly relies on the real Web File
 * API's `arrayBuffer()`, available in every target browser).
 */
function fileWithArrayBuffer(bytes: Uint8Array, name = "doc.pdf"): File {
  const file = new File([bytes as BlobPart], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.buffer,
  });
  return file;
}

describe("ClientHashRecompute (spec: Client-Side Independent Hash Recompute — tribunal-demo-critical)", () => {
  it("computes sha256Hex over the uploaded file's own bytes and renders the resulting hash", async () => {
    sha256HexMock.mockResolvedValueOnce("a".repeat(64));
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = fileWithArrayBuffer(bytes);

    render(<ClientHashRecompute file={file} />);

    await waitFor(() => expect(screen.getByText("a".repeat(64))).toBeInTheDocument());

    expect(sha256HexMock).toHaveBeenCalledTimes(1);
    const [calledWith] = sha256HexMock.mock.calls[0]!;
    expect(calledWith).toBeInstanceOf(Uint8Array);
    expect(Array.from(calledWith as Uint8Array)).toEqual([1, 2, 3, 4]);
  });

  it("recomputes independently for a DIFFERENT file — the hash is the file's, not a hardcoded value (triangulation)", async () => {
    sha256HexMock.mockResolvedValueOnce("b".repeat(64));
    const bytes = new Uint8Array([9, 8, 7]);
    const file = fileWithArrayBuffer(bytes, "other.pdf");

    render(<ClientHashRecompute file={file} />);

    await waitFor(() => expect(screen.getByText("b".repeat(64))).toBeInTheDocument());

    const [calledWith] = sha256HexMock.mock.calls[0]!;
    expect(Array.from(calledWith as Uint8Array)).toEqual([9, 8, 7]);
  });

  it("collapses the caveat inside a native <details>/<summary>, never claiming full on-chain hash re-derivation (docs/11 criterion 5)", async () => {
    sha256HexMock.mockResolvedValueOnce("c".repeat(64));
    render(<ClientHashRecompute file={fileWithArrayBuffer(new Uint8Array([1]))} />);

    await waitFor(() => expect(screen.getByText("c".repeat(64))).toBeInTheDocument());

    const caveatText = /no reconstruye ni verifica el hash canónico anclado/;
    const summary = screen.getByText(verifyDictionary.recompute.caveatLabel);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details).toContainElement(screen.getByText(caveatText));
  });

  it("renders an explicit error state (never blank forever) when the recompute rejects (e.g. crypto.subtle unavailable)", async () => {
    sha256HexMock.mockRejectedValueOnce(new Error("crypto.subtle unavailable"));

    render(<ClientHashRecompute file={fileWithArrayBuffer(new Uint8Array([1, 2, 3]))} />);

    await waitFor(() =>
      expect(
        screen.getByText(/No pudimos calcular el hash en tu navegador/),
      ).toBeInTheDocument(),
    );
    // The error state is announced (role="alert"), not silently swallowed.
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears the previous file's hash when the selected file changes (never shows a stale hash)", async () => {
    sha256HexMock.mockResolvedValueOnce("a".repeat(64));
    const { rerender } = render(
      <ClientHashRecompute file={fileWithArrayBuffer(new Uint8Array([1, 2, 3]), "first.pdf")} />,
    );
    await waitFor(() => expect(screen.getByText("a".repeat(64))).toBeInTheDocument());

    // Switch to a different file whose hash resolves later — the old hash
    // must disappear immediately, not linger through the new computation.
    let resolveSecond: (value: string) => void = () => {};
    sha256HexMock.mockImplementationOnce(
      () => new Promise<string>((resolve) => (resolveSecond = resolve)),
    );
    rerender(
      <ClientHashRecompute file={fileWithArrayBuffer(new Uint8Array([9, 9]), "second.pdf")} />,
    );

    await waitFor(() =>
      expect(screen.queryByText("a".repeat(64))).not.toBeInTheDocument(),
    );

    resolveSecond("b".repeat(64));
    await waitFor(() => expect(screen.getByText("b".repeat(64))).toBeInTheDocument());
  });
});
