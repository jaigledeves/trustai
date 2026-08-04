import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

describe("dtrs list loading fallback (spec: web-visual-coherence — Route-Level Loading and Not-Found Fallbacks)", () => {
  it("renders a skeleton placeholder while the DTR list streams in", () => {
    const { container } = render(<Loading />);

    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });
});
