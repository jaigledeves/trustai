import { describe, expect, it } from "vitest";
import { initials, truncate } from "../src/string.js";

describe("truncate", () => {
  it("returns the string unchanged if within limit", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });

  it("truncates and adds ellipsis when over limit", () => {
    expect(truncate("Hello world", 8)).toBe("Hello...");
  });

  it("returns exactly maxLength characters", () => {
    const result = truncate("Hello world", 8);
    expect(result.length).toBe(8);
  });
});

describe("initials", () => {
  it("returns two initials for a full name", () => {
    expect(initials("Jose Aguilera")).toBe("JA");
  });

  it("returns one initial for a single name", () => {
    expect(initials("Alice")).toBe("A");
  });

  it("ignores extra whitespace", () => {
    expect(initials("  Jose   Aguilera  ")).toBe("JA");
  });

  it("uses only the first two words", () => {
    expect(initials("Jose Antonio Aguilera")).toBe("JA");
  });
});
