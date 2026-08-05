import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { RegisterForm } from "./RegisterForm";

describe("RegisterForm (spec: web-auth-flow Registration)", () => {
  it("shows Spanish validation errors before any network call for an invalid email/short password", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/auth/register", () => {
        requestMade = true;
        return HttpResponse.json({ userId: "u1", organizationId: "o1" });
      }),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Contraseña"), "short");
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(await screen.findByText("Ingresa un email válido.")).toBeInTheDocument();
    // Appears twice: the always-visible policy hint AND the policy error,
    // which intentionally share identical copy (design.md's duplicated-copy
    // decision) — two matches proves both the static hint and the error render.
    expect(
      screen.getAllByText(
        "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
      ),
    ).toHaveLength(2);
    expect(requestMade).toBe(false);
  });

  it("shows the 'revisa tu email' success screen on successful registration (no redirect, no auto-login)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/auth/register", () =>
        HttpResponse.json({ userId: "u1", organizationId: "o1" }, { status: 201 }),
      ),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "correcthorse1",
    );
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(
      await screen.findByText(
        "Revisa tu email para verificar tu cuenta antes de iniciar sesión.",
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
      http.post("http://localhost:3000/api/backend/auth/register", async () => {
        await pending;
        return HttpResponse.json({ userId: "u1", organizationId: "o1" });
      }),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "correcthorse1",
    );
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    const submitButton = await screen.findByRole("button", {
      name: "Registrarme",
    });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");

    resolveResponse();
    await vi.waitFor(() =>
      expect(
        screen.getByText(
          "Revisa tu email para verificar tu cuenta antes de iniciar sesión.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("maps a 409 duplicate-email response to the exact spec copy", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/auth/register", () =>
        HttpResponse.json({ status: 409, message: "Email is already registered" }, { status: 409 }),
      ),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "correcthorse1",
    );
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(
      await screen.findByText("Este email ya está registrado."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registrarme" })).not.toBeDisabled(),
    );
  });

  it("blocks submit and shows an inline mismatch error when confirm-password differs (spec: Register Form Confirms Password Match)", async () => {
    const user = userEvent.setup();
    let requestMade = false;
    server.use(
      http.post("http://localhost:3000/api/backend/auth/register", () => {
        requestMade = true;
        return HttpResponse.json({ userId: "u1", organizationId: "o1" });
      }),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "different1",
    );
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(
      await screen.findByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("shows the password-policy hint before any typing or submitting (spec: Register Form Displays Password Policy Proactively)", () => {
    render(<RegisterForm />);

    expect(
      screen.getByText(
        "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
      ),
    ).toBeInTheDocument();
  });

  it("associates the password hint with the password field on mount, with no invalid state (spec: Register Password Fields Expose Hints and Errors to Assistive Technology)", () => {
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText("Contraseña");
    expect(passwordInput).toHaveAccessibleDescription(
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    );
    expect(passwordInput).not.toHaveAttribute("aria-invalid");
  });

  it("marks the password and confirm-password inputs aria-invalid and exposes their error text on a failed submit", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "short");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "different");
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    const policyText =
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.";
    const passwordInput = await screen.findByLabelText("Contraseña");
    expect(passwordInput).toHaveAttribute("aria-invalid", "true");
    // On error, aria-describedby points only to the error paragraph (not the
    // static hint), so the policy text is announced once — the hint and error
    // share identical copy, so referencing both would read it twice.
    expect(passwordInput).toHaveAccessibleDescription(policyText);

    const confirmInput = screen.getByLabelText("Confirmar contraseña");
    expect(confirmInput).toHaveAttribute("aria-invalid", "true");
    expect(confirmInput).toHaveAccessibleDescription(
      "Las contraseñas no coinciden.",
    );
  });
});
