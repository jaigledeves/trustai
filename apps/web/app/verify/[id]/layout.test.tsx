import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VerifyIdLayout from "./layout";

describe("verify/[id] layout (spec: web-visual-coherence — Decision 7, persistent header)", () => {
  it("renders the header (Wordmark + section nav) once around children", () => {
    render(
      <VerifyIdLayout>
        <p>CHILD_CONTENT</p>
      </VerifyIdLayout>,
    );

    expect(screen.getByRole("link", { name: /trust\s*ai/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeInTheDocument();
    expect(screen.getByText("CHILD_CONTENT")).toBeInTheDocument();
  });
});
