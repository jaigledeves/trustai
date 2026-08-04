import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const { LoginForm } = await import("./LoginForm");

describe("LoginForm (spec: Login and Session Establishment)", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("shows validation errors before any network call for an invalid email/empty password", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/auth/login", () => {
        requestMade = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Ingresa un email válido.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("redirects to /dtrs on successful login", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/auth/login", () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dtrs"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the generic no-enumeration message on invalid credentials (401)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/auth/login", () =>
        HttpResponse.json(
          { status: 401, message: "Email o contraseña incorrectos." },
          { status: 401 },
        ),
      ),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(
      await screen.findByText("Email o contraseña incorrectos."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables submit and shows pending feedback while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveResponse!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveResponse = resolve;
    });
    server.use(
      http.post("http://localhost:3000/api/auth/login", async () => {
        await pending;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    const submitButton = await screen.findByRole("button", {
      name: "Ingresar",
    });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");

    resolveResponse();
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dtrs"));
  });

  it("shows the distinct unverified-email message on 403", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/auth/login", () =>
        HttpResponse.json(
          { status: 403, message: "Verifica tu email antes de iniciar sesión." },
          { status: 403 },
        ),
      ),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(
      await screen.findByText("Verifica tu email antes de iniciar sesión."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
