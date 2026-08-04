import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuthLayout from "./layout";

describe("AuthLayout (spec: web-visual-coherence — Auth Surface Cohesion)", () => {
  it("renders the Wordmark once, linking home, around the page content", () => {
    render(
      <AuthLayout>
        <p>Contenido del formulario</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Contenido del formulario")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /trust\s*ai/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders exactly one Wordmark and one gradient overlay even with multiple children", () => {
    const { container } = render(
      <AuthLayout>
        <p>Uno</p>
        <p>Dos</p>
      </AuthLayout>,
    );

    expect(screen.getAllByRole("link", { name: /trust\s*ai/i })).toHaveLength(
      1,
    );
    expect(
      container.querySelectorAll('[data-slot="auth-gradient"]'),
    ).toHaveLength(1);
  });
});
