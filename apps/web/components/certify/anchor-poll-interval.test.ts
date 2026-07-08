import { describe, expect, it } from "vitest";
import { resolveAnchorRefetchInterval } from "./anchor-poll-interval";

describe("resolveAnchorRefetchInterval (pure — spec: Anchor Submission and Polling)", () => {
  it("polls every 3000ms while ANCHORING", () => {
    expect(resolveAnchorRefetchInterval("ANCHORING")).toBe(3000);
  });

  it("stops polling once CERTIFIED (terminal — success)", () => {
    expect(resolveAnchorRefetchInterval("CERTIFIED")).toBe(false);
  });

  it("stops polling once FAILED (terminal — no retry button, RF-033)", () => {
    expect(resolveAnchorRefetchInterval("FAILED")).toBe(false);
  });

  it("does not poll while still READY (anchoring hasn't been submitted yet)", () => {
    expect(resolveAnchorRefetchInterval("READY")).toBe(false);
  });

  it("does not poll for an unknown/undefined state (no data yet)", () => {
    expect(resolveAnchorRefetchInterval(undefined)).toBe(false);
  });
});
