import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { historyDictionary } from "../../dictionaries/es/history";
import { PublicVerifyShare } from "./PublicVerifyShare";

describe("PublicVerifyShare (spec: shareable public verification — QR + link)", () => {
  const verifyUrl = "https://trustai.example/verify/tr-1";

  it("shows the public verification URL and an open link pointing to it", () => {
    render(<PublicVerifyShare verifyUrl={verifyUrl} />);

    expect(
      screen.getByText(historyDictionary.publicShare.title),
    ).toBeInTheDocument();
    expect(screen.getByText(verifyUrl)).toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: historyDictionary.publicShare.openLinkLabel,
    });
    expect(link).toHaveAttribute("href", verifyUrl);
  });

  it("renders a QR code (accessible SVG) that encodes the verification URL", () => {
    render(<PublicVerifyShare verifyUrl={verifyUrl} />);

    // qrcode.react renders an <svg> carrying an accessible <title> when given
    // the `title` prop — that is how a scanner-facing image stays labelled.
    expect(
      screen.getByTitle(historyDictionary.publicShare.qrTitle),
    ).toBeInTheDocument();
  });
});
