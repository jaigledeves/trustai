import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
});
