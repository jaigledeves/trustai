import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

describe("ResetPasswordForm (spec: auth-password-recovery — Reset Form Confirms Password Match, Invalid or Expired Token Web Handling)", () => {
  it("shows a password-policy error before any network call", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post(
        "http://localhost:3000/api/backend/auth/reset-password",
        () => {
          requestMade = true;
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    render(<ResetPasswordForm token="valid-token" />);
    await user.type(screen.getByLabelText("Nueva contraseña"), "short");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "short");
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    expect(
      await screen.findByText(
        "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
      ),
    ).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("shows a mismatch error before any network call when confirmation doesn't match", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post(
        "http://localhost:3000/api/backend/auth/reset-password",
        () => {
          requestMade = true;
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    render(<ResetPasswordForm token="valid-token" />);
    await user.type(screen.getByLabelText("Nueva contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "different1",
    );
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    expect(
      await screen.findByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("submits the token and new password, showing the success panel with a login link", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      http.post(
        "http://localhost:3000/api/backend/auth/reset-password",
        async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    render(<ResetPasswordForm token="valid-token" />);
    await user.type(screen.getByLabelText("Nueva contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "correcthorse1",
    );
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    expect(
      await screen.findByText(
        "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/login");
    expect(capturedBody).toEqual({
      token: "valid-token",
      newPassword: "correcthorse1",
    });
  });

  it("shows the invalid/expired-token error panel with a link to /forgot-password on a 400 response", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/auth/reset-password", () =>
        HttpResponse.json(
          { status: 400, message: "Invalid or expired password reset token" },
          { status: 400 },
        ),
      ),
    );

    render(<ResetPasswordForm token="expired-token" />);
    await user.type(screen.getByLabelText("Nueva contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "correcthorse1",
    );
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    expect(
      await screen.findByText(
        "El enlace es inválido o venció. Solicita uno nuevo para continuar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Solicitar un enlace nuevo" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});
