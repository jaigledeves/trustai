import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { landingDictionary } from "@/dictionaries/es/landing";
import { verifyDictionary } from "@/dictionaries/es/verify";
import { VerificationDemo } from "./VerificationDemo";

/**
 * Spec: public-landing — Honest Verification Demo. Toggling each of the 4
 * real backend verdicts renders `verifyDictionary.verdicts[key]`'s exact
 * title/message (sourced, not re-authored). The static recompute
 * disclosure (`landingDictionary.verificationDemo.recompute`) always
 * renders, regardless of the selected verdict, and never claims the
 * browser-recomputed hash matches/verifies the on-chain hash.
 */
describe("VerificationDemo (spec: public-landing — Honest Verification Demo)", () => {
  it("defaults to the VALID verdict", () => {
    render(<VerificationDemo />);

    const panel = screen.getByRole("status");
    expect(within(panel).getByText(verifyDictionary.verdicts.VALID.title)).toBeInTheDocument();
    expect(
      within(panel).getByText(verifyDictionary.verdicts.VALID.message),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: verifyDictionary.verdicts.VALID.title }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggling ASSET_MISMATCH renders its exact title/message as an alert", async () => {
    const user = userEvent.setup();
    render(<VerificationDemo />);

    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.ASSET_MISMATCH.title }),
    );

    expect(
      await screen.findByText(verifyDictionary.verdicts.ASSET_MISMATCH.message),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      verifyDictionary.verdicts.ASSET_MISMATCH.message,
    );
  });

  it("toggling PENDING_ANCHOR renders its exact title/message as a status", async () => {
    const user = userEvent.setup();
    render(<VerificationDemo />);

    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.PENDING_ANCHOR.title }),
    );

    expect(
      await screen.findByText(verifyDictionary.verdicts.PENDING_ANCHOR.message),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      verifyDictionary.verdicts.PENDING_ANCHOR.message,
    );
  });

  it("toggling INVALID_RECORD renders its exact title/message as an alert", async () => {
    const user = userEvent.setup();
    render(<VerificationDemo />);

    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.INVALID_RECORD.title }),
    );

    expect(
      await screen.findByText(verifyDictionary.verdicts.INVALID_RECORD.message),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      verifyDictionary.verdicts.INVALID_RECORD.message,
    );
  });

  it("toggling back to VALID renders it as a status, not an alert", async () => {
    const user = userEvent.setup();
    render(<VerificationDemo />);

    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.ASSET_MISMATCH.title }),
    );
    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.VALID.title }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      verifyDictionary.verdicts.VALID.message,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the static recompute disclosure once, unaffected by the selected verdict, with the honest caveat", async () => {
    const user = userEvent.setup();
    render(<VerificationDemo />);

    const recompute = landingDictionary.verificationDemo.recompute;
    expect(screen.getByText(recompute.statement)).toBeInTheDocument();
    expect(screen.getByText(recompute.caveat)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: verifyDictionary.verdicts.INVALID_RECORD.title }),
    );

    expect(screen.getAllByText(recompute.statement)).toHaveLength(1);
    expect(screen.getAllByText(recompute.caveat)).toHaveLength(1);
  });
});
