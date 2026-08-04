import { describe, expect, it } from "vitest";
import { truncateId } from "./format";

describe("truncateId (spec: web-visual-coherence — Truncated Yet Accessible Record IDs)", () => {
  it("truncates a value longer than the threshold to a middle-ellipsis form", () => {
    expect(truncateId("0x1a2b3c4d5e6f7g8h9f3e")).toBe("0x1a2b\u20269f3e");
  });

  it("leaves a value at or under the threshold untouched", () => {
    expect(truncateId("tr-1")).toBe("tr-1");
    expect(truncateId("a".repeat(12))).toBe("a".repeat(12));
  });

  it("truncates a value one character over a custom threshold", () => {
    expect(truncateId("abcdefgh", 7)).toBe("abcdef\u2026efgh");
  });
});
