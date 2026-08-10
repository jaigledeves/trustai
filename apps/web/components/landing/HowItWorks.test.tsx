import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { glossaryDictionary } from "@/dictionaries/es/glossary";
import { landingDictionary } from "@/dictionaries/es/landing";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks (spec: web-plain-language — Plain-Language Framing for Unavoidable Terms)", () => {
  it("pairs the 'blockchain' mention inside the technical detail with a QuickHelp explanation", async () => {
    const user = userEvent.setup();
    render(<HowItWorks />);

    await user.click(screen.getByText(landingDictionary.how.technicalDetailLabel));

    const trigger = screen.getByRole("button", { name: glossaryDictionary.blockchain.term });
    await user.click(trigger);

    expect(screen.getByText(glossaryDictionary.blockchain.definition)).toBeInTheDocument();
  });
});
