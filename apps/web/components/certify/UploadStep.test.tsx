import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const { UploadStep } = await import("./UploadStep");

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function pdfFile(name = "doc.pdf") {
  return new File(["%PDF-1.4 fake bytes"], name, { type: "application/pdf" });
}

function docxFile(name = "doc.docx") {
  return new File(["not a pdf"], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/** The dropzone is the `<label>` wrapping the visible drop-label span. */
function getDropzone() {
  const label = screen.getByText("Elige un archivo PDF para certificar").closest("label");
  if (!label) {
    throw new Error("Dropzone <label> not found");
  }
  return label;
}

// jsdom does not implement the `DataTransfer` constructor (verified: jsdom
// 25, per apps/web/package.json) — `handleDrop` only reads
// `event.dataTransfer.files[0]`, so a plain object with a `files` array
// satisfies the component under test without needing the real DOM type.
function dataTransferWith(file: File) {
  return { files: [file] };
}

describe("UploadStep (spec: PDF Upload)", () => {
  it("rejects a non-PDF file client-side before any network call", async () => {
    // applyAccept: false — the input's `accept="application/pdf"` is an OS
    // file-picker hint only; a user can still get a non-PDF file through
    // (e.g. drag-and-drop), so the JS-level validation must catch it too.
    // Bypassing user-event's accept-attribute simulation here proves THAT
    // validation runs, not just the browser's picker filter.
    const user = userEvent.setup({ applyAccept: false });
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/assets", () => {
        requestMade = true;
        return HttpResponse.json({ assetId: "a1", trustRecordId: "tr1", duplicate: false });
      }),
    );

    renderWithQueryClient(<UploadStep />);
    const input = screen.getByLabelText("Elige un archivo PDF para certificar");
    const docxFile = new File(["not a pdf"], "doc.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await user.upload(input, docxFile);

    expect(screen.getByText("Solo se aceptan archivos PDF.")).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("uploads a valid PDF and navigates to the new trust record on success", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/assets", () =>
        HttpResponse.json(
          { assetId: "a1", trustRecordId: "tr-new", duplicate: false },
          { status: 201 },
        ),
      ),
    );

    renderWithQueryClient(<UploadStep />);
    const input = screen.getByLabelText("Elige un archivo PDF para certificar");
    await user.upload(input, pdfFile());
    await user.click(screen.getByRole("button", { name: "Subir documento" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dtrs/tr-new"));
  });

  it("navigates to the EXISTING trust record with a duplicate notice when duplicate:true (RF-012)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/assets", () =>
        HttpResponse.json(
          { assetId: "a1", trustRecordId: "tr-existing", duplicate: true },
          { status: 201 },
        ),
      ),
    );

    renderWithQueryClient(<UploadStep />);
    const input = screen.getByLabelText("Elige un archivo PDF para certificar");
    await user.upload(input, pdfFile());
    await user.click(screen.getByRole("button", { name: "Subir documento" }));

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dtrs/tr-existing?notice=duplicate"),
    );
  });

  it("accepts a PDF via drag-and-drop and shows the filename", () => {
    renderWithQueryClient(<UploadStep />);
    const dropzone = getDropzone();

    fireEvent.drop(dropzone, { dataTransfer: dataTransferWith(pdfFile("dropped.pdf")) });

    expect(screen.getByText("dropped.pdf")).toBeInTheDocument();
  });

  it("rejects a non-PDF file via drag-and-drop with the validation error", () => {
    renderWithQueryClient(<UploadStep />);
    const dropzone = getDropzone();

    fireEvent.drop(dropzone, { dataTransfer: dataTransferWith(docxFile()) });

    expect(screen.getByText("Solo se aceptan archivos PDF.")).toBeInTheDocument();
    expect(screen.queryByText("doc.docx")).not.toBeInTheDocument();
  });

  it("shows the file size alongside the filename after selection", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<UploadStep />);
    const input = screen.getByLabelText("Elige un archivo PDF para certificar");

    await user.upload(input, pdfFile());

    expect(screen.getByText(/Tamaño: /)).toBeInTheDocument();
  });

  it("applies drag-over visual class when dragging over the dropzone", () => {
    renderWithQueryClient(<UploadStep />);
    const dropzone = getDropzone();

    fireEvent.dragOver(dropzone);

    expect(dropzone.classList.contains("border-primary")).toBe(true);
  });

  it("removes drag-over visual when drag leaves the dropzone boundary", () => {
    renderWithQueryClient(<UploadStep />);
    const dropzone = getDropzone();

    fireEvent.dragEnter(dropzone);
    expect(dropzone.classList.contains("border-primary")).toBe(true);

    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });

    expect(dropzone.classList.contains("border-primary")).toBe(false);
  });
});
