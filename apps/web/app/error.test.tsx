import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Error from "./error";

describe("app/error.tsx (root error boundary — spec: app renders its own {message} shape, not Next's crash page)", () => {
  it("renders the app's generic Spanish error copy instead of leaking the raw error", () => {
    render(<Error error={new globalThis.Error("backend down")} unstable_retry={vi.fn()} />);

    expect(
      screen.getByText("Ocurrió un error inesperado. Probá de nuevo en unos minutos."),
    ).toBeInTheDocument();
    // The raw error message must never be shown to the user.
    expect(screen.queryByText(/backend down/)).not.toBeInTheDocument();
  });

  it("invokes unstable_retry (the v16.2 recovery affordance) when the user clicks Reintentar", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(<Error error={new globalThis.Error("boom")} unstable_retry={retry} />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
