import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authDictionary } from "../../../dictionaries/es/auth";

const { default: ResetPasswordPage } = await import("./page");

describe("ResetPasswordPage (spec: Invalid or Expired Token Web Handling)", () => {
  it("shows the invalid-token error state directly when no token is present in the URL", async () => {
    const jsx = await ResetPasswordPage({
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      screen.getByText(authDictionary.resetPassword.errorMessage),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: authDictionary.resetPassword.errorCta,
      }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the reset-password form when a token is present in the URL", async () => {
    const jsx = await ResetPasswordPage({
      searchParams: Promise.resolve({ token: "some-token" }),
    });
    render(jsx);

    expect(
      screen.getByLabelText(authDictionary.resetPassword.newPasswordLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        authDictionary.resetPassword.confirmPasswordLabel,
      ),
    ).toBeInTheDocument();
  });
});
