import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

describe("ForgotPasswordForm (spec: auth-password-recovery — Forgot-Password Enumeration Defense)", () => {
  it("shows a Spanish validation error before any network call for an invalid email", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post(
        "http://localhost:3000/api/backend/auth/forgot-password",
        () => {
          requestMade = true;
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(
      await screen.findByText("Ingresa un email válido."),
    ).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("shows the same enumeration-safe success panel regardless of whether the email is registered", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/auth/forgot-password", () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(
      await screen.findByText(
        "Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/login");
  });

  it("disables submit and shows pending feedback while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveResponse!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveResponse = resolve;
    });
    server.use(
      http.post(
        "http://localhost:3000/api/backend/auth/forgot-password",
        async () => {
          await pending;
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    const submitButton = await screen.findByRole("button", {
      name: "Enviar enlace",
    });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");

    resolveResponse();
    await vi.waitFor(() =>
      expect(
        screen.getByText(
          "Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
