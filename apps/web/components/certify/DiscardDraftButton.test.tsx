import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("DiscardDraftButton (spec: Discard a Draft (SHOULD))", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pushMock.mockClear();
  });

  it("asks for confirmation, discards on confirm, and returns to the upload step", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/discard", () => {
        requestMade = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithQueryClient(<DiscardDraftButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Descartar borrador" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "¿Seguro que querés descartar este borrador? Esta acción no se puede deshacer.",
    );
    await vi.waitFor(() => expect(requestMade).toBe(true));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dtrs/new"));
  });

  it("does nothing when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/discard", () => {
        requestMade = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithQueryClient(<DiscardDraftButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Descartar borrador" }));

    expect(requestMade).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
