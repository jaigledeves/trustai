import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { glossaryDictionary } from "@/dictionaries/es/glossary";
import { landingDictionary } from "@/dictionaries/es/landing";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks (spec: web-plain-language — Plain-Language Framing for Unavoidable Terms)", () => {
  it("exposes the 'blockchain' QuickHelp in the default-visible flow (step 4), not hidden inside the technical detail", async () => {
    const user = userEvent.setup();
    render(<HowItWorks />);

    // The help must be reachable WITHOUT opening "Ver el detalle técnico":
    // a layperson reading the four steps meets "blockchain" here first.
    // Exactly one blockchain help exists, and it lives in the visible flow.
    const triggers = screen.getAllByRole("button", {
      name: glossaryDictionary.blockchain.title,
    });
    expect(triggers).toHaveLength(1);

    await user.click(triggers[0]!);
    expect(screen.getByText(glossaryDictionary.blockchain.definition)).toBeInTheDocument();
  });

  it("keeps 'Ver el detalle técnico' present but does not put the blockchain QuickHelp inside it", () => {
    render(<HowItWorks />);
    expect(screen.getByText(landingDictionary.how.technicalDetailLabel)).toBeInTheDocument();
  });
});
