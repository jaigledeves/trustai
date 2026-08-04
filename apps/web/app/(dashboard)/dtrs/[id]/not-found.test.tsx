import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { shellDictionary } from "../../../../dictionaries/es/shell";
import NotFound from "./not-found";

describe("dtr detail not-found fallback (spec: web-visual-coherence — Dead record renders branded not-found with recovery)", () => {
  it("renders a branded message with a recovery link back to /dtrs", () => {
    render(<NotFound />);

    expect(
      screen.getByText(shellDictionary.errors.notFound),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: shellDictionary.nav.dtrs }),
    ).toHaveAttribute("href", "/dtrs");
  });
});
