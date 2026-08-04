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

const { DiscardDraftButton } = await import("./DiscardDraftButton");

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * Rewritten for the AlertDialog-based confirmation (spec:
 * web-visual-coherence — "Dialog-Based Discard Confirmation", design.md
 * Decision 3). No more `window.confirm` spy: the trigger opens an
 * accessible `role="alertdialog"`, and confirm/cancel are distinct,
 * separately queryable buttons.
 */
describe("DiscardDraftButton (spec: Discard a Draft (SHOULD))", () => {
  it("opens an accessible dialog and discards the draft when confirmed", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/discard", () => {
        requestMade = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithQueryClient(<DiscardDraftButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Descartar borrador" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(
      "¿Seguro que quieres descartar este borrador? Esta acción no se puede deshacer.",
    );

    await user.click(screen.getByRole("button", { name: "Sí, descartar" }));

    await vi.waitFor(() => expect(requestMade).toBe(true));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dtrs/new"));
  });

  it("keeps the draft and sends no request when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/discard", () => {
        requestMade = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithQueryClient(<DiscardDraftButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Descartar borrador" }));
    await screen.findByRole("alertdialog");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(requestMade).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
