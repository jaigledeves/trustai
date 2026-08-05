import { render, screen, waitFor } from "@testing-library/react";
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

    // Appears twice: the always-visible policy hint AND the policy error,
    // which intentionally share identical copy (design.md's duplicated-copy
    // decision) — two matches proves both the static hint and the error render.
    await waitFor(() =>
      expect(
        screen.getAllByText(
          "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
        ),
      ).toHaveLength(2),
    );
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

  it("shows the password-policy hint before any typing or submitting (spec: Reset Form Displays Password Policy Proactively)", () => {
    render(<ResetPasswordForm token="valid-token" />);

    // Appears twice: the always-visible policy hint AND the policy error
    // (not rendered yet, so exactly one match) — confirms the static hint
    // itself, independent of any submit/error state.
    expect(
      screen.getByText(
        "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
      ),
    ).toBeInTheDocument();
  });

  it("associates the password hint with the new-password field on mount, with no invalid state (spec: Reset Password Fields Expose Hints and Errors to Assistive Technology)", () => {
    render(<ResetPasswordForm token="valid-token" />);

    const newPasswordInput = screen.getByLabelText("Nueva contraseña");
    expect(newPasswordInput).toHaveAccessibleDescription(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
    expect(newPasswordInput).not.toHaveAttribute("aria-invalid");
  });

  it("marks the new-password and confirm inputs aria-invalid and exposes their error text on a failed submit", async () => {
    const user = userEvent.setup();
    const policyText =
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.";

    render(<ResetPasswordForm token="valid-token" />);
    await user.type(screen.getByLabelText("Nueva contraseña"), "short");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "different");
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    const newPasswordInput = await screen.findByLabelText("Nueva contraseña");
    expect(newPasswordInput).toHaveAttribute("aria-invalid", "true");
    // On error, aria-describedby points only to the error paragraph (not the
    // static hint), so the policy text is announced once — the hint and error
    // share identical copy, so referencing both would read it twice.
    expect(newPasswordInput).toHaveAccessibleDescription(policyText);

    const confirmInput = screen.getByLabelText("Confirmar contraseña");
    expect(confirmInput).toHaveAttribute("aria-invalid", "true");
    expect(confirmInput).toHaveAccessibleDescription(
      "Las contraseñas no coinciden.",
    );
  });
});
