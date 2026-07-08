import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { ConfirmButton } from "./ConfirmButton";

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ConfirmButton (spec: Confirm (DRAFT -> READY))", () => {
  it("renders canonicalHash as frozen evidence on successful confirm", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/confirm", () =>
        HttpResponse.json(
          {
            trustRecordId: "tr-1",
            state: "READY",
            canonicalHash: "a".repeat(64),
            issuedAt: "2026-01-01T00:00:00.000Z",
          },
          { status: 201 },
        ),
      ),
    );

    renderWithQueryClient(<ConfirmButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Confirmar certificación" }));

    expect(await screen.findByText("a".repeat(64))).toBeInTheDocument();
    expect(
      screen.getByText("Hash canónico (evidencia congelada)"),
    ).toBeInTheDocument();
  });

  it("surfaces a 409 as a blocking error and never renders a hash", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/trust-records/tr-1/confirm", () =>
        HttpResponse.json({ status: 409, message: "conflict" }, { status: 409 }),
      ),
    );

    renderWithQueryClient(<ConfirmButton id="tr-1" />);
    await user.click(screen.getByRole("button", { name: "Confirmar certificación" }));

    expect(
      await screen.findByText(
        "Todavía no se puede certificar: falta completar el análisis o el estado no lo permite.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hash canónico (evidencia congelada)")).not.toBeInTheDocument();
  });
});
