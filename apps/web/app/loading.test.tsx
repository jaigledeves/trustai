import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

describe("root loading fallback (spec: web-visual-coherence — Route-Level Loading and Not-Found Fallbacks)", () => {
  it("renders a centered spinner while the root segment streams in", () => {
    const { container } = render(<Loading />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
