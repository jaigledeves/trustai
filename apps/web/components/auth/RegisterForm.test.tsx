import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
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

    expect(await screen.findByText("Ingresá un email válido.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
      ),
    ).toBeInTheDocument();
    expect(requestMade).toBe(false);
  });

  it("shows the 'revisá tu email' success screen on successful registration (no redirect, no auto-login)", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:3000/api/backend/auth/register", () =>
        HttpResponse.json({ userId: "u1", organizationId: "o1" }, { status: 201 }),
      ),
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(
      await screen.findByText(
        "Revisá tu email para verificar tu cuenta antes de iniciar sesión.",
      ),
    ).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(
      await screen.findByText("Este email ya está registrado."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registrarme" })).not.toBeDisabled(),
    );
  });
});
