import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingDictionary } from "@/dictionaries/es/landing";
import { Hero } from "./Hero";

describe("Hero (spec: public-landing — Hero Value Props Are the Single Source of Free/No-Card Messaging)", () => {
  it("renders the green-check value props as the single source of the free/no-card messaging", () => {
    render(<Hero />);

    for (const prop of landingDictionary.hero.valueProps) {
      expect(screen.getByText(prop)).toBeInTheDocument();
    }
  });

  it("does not render the removed free/no-card microcopy line under the CTAs", () => {
    render(<Hero />);

    // The old `ctaMicrocopy` ("Gratis · Sin tarjeta · Sin instalar nada") was
    // removed as a duplicate of the value-props list. "Sin tarjeta" was unique
    // to that line (never a value prop), so its absence proves the dedup.
    expect(screen.queryByText(/sin tarjeta/i)).not.toBeInTheDocument();
  });
});
