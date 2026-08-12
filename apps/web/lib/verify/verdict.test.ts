import { describe, expect, it } from "vitest";
import { classifyVerdict } from "./verdict";

/**
 * Spec: web-public-verify — "Four Verdicts" / "Accessible Verdict Outcome
 * Roles". Pure mapping from the four real backend verdicts to one of three
 * visual severities — no DOM, no React.
 */
describe("classifyVerdict (spec: web-public-verify — Four Verdicts)", () => {
  it("classifies VALID as success", () => {
    expect(classifyVerdict("VALID")).toBe("success");
  });

  it("classifies PENDING_ANCHOR as pending, not success", () => {
    expect(classifyVerdict("PENDING_ANCHOR")).toBe("pending");
  });

  it("classifies ASSET_MISMATCH as error", () => {
    expect(classifyVerdict("ASSET_MISMATCH")).toBe("error");
  });

  it("classifies INVALID_RECORD as error", () => {
    expect(classifyVerdict("INVALID_RECORD")).toBe("error");
  });
});
