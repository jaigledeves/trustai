import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { authDictionary } from "../../../dictionaries/es/auth";
import { server } from "../../../test/msw/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

const { default: VerifyEmailPage } = await import("./page");

describe("VerifyEmailPage (spec: Email Verification Landing)", () => {
  it("renders a success message with a CTA to /login for a valid token", async () => {
    server.use(
      http.get("http://localhost:3000/auth/verify-email", ({ request }) => {
        const token = new URL(request.url).searchParams.get("token");
        expect(token).toBe("valid-token");
        return HttpResponse.json({ verified: true });
      }),
    );

    const jsx = await VerifyEmailPage({
      searchParams: Promise.resolve({ token: "valid-token" }),
    });
    render(jsx);

    expect(
      screen.getByText("Tu email quedó verificado. Ya puedes iniciar sesión."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("renders an explicit error (never a silent redirect) for an invalid/expired token", async () => {
    server.use(
      http.get("http://localhost:3000/auth/verify-email", () =>
        HttpResponse.json(
          { statusCode: 400, message: "Invalid or expired verification token" },
          { status: 400 },
        ),
      ),
    );

    const jsx = await VerifyEmailPage({
      searchParams: Promise.resolve({ token: "expired-token" }),
    });
    render(jsx);

    expect(
      screen.getByText("El enlace es inválido o venció. Regístrate de nuevo para recibir uno nuevo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ir a iniciar sesión" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: authDictionary.login.registerCta }),
    ).toHaveAttribute("href", "/register");
  });
});
