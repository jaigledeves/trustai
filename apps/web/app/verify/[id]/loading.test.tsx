import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Layout from "./layout";
import Loading from "./loading";

describe("verify/[id] loading fallback (spec: web-visual-coherence — Decision 7, header persists during suspense)", () => {
  it("renders skeleton content under the persistent layout header", () => {
    const { container } = render(
      <Layout>
        <Loading />
      </Layout>,
    );

    expect(screen.getByRole("link", { name: /trust\s*ai/i })).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });
});
