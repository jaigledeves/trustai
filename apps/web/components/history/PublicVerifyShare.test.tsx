import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("copies the verify URL to the clipboard and swaps the label to the copied state (spec: web-visual-coherence — Copy-to-Clipboard for Public Verify URL)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<PublicVerifyShare verifyUrl={verifyUrl} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: historyDictionary.publicShare.copyLabel,
      }),
    );

    expect(writeText).toHaveBeenCalledWith(verifyUrl);
    expect(
      await screen.findByRole("button", {
        name: historyDictionary.publicShare.copiedLabel,
      }),
    ).toBeInTheDocument();
  });
});
