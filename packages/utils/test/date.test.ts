import { describe, expect, it } from "vitest";
import { formatDate, formatRelativeTime } from "../src/date.js";

describe("formatDate", () => {
  it("formats a date in Spanish by default", () => {
    const result = formatDate(new Date("2026-07-20T12:00:00Z"), "es-ES");
    expect(result).toContain("2026");
    expect(result).toContain("julio");
  });

  it("respects a custom locale", () => {
    const result = formatDate(new Date("2026-07-20T12:00:00Z"), "en-US");
    expect(result).toContain("2026");
    expect(result).toContain("July");
  });
});

describe("formatRelativeTime", () => {
  it("returns relative days for a past date", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toContain("3");
  });

  it("returns relative hours for a recent date", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toContain("2");
  });
});
