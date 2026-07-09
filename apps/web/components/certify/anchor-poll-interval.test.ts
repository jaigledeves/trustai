import { describe, expect, it } from "vitest";
import {
  MAX_ANCHOR_POLL_ATTEMPTS,
  resolveAnchorRefetchInterval,
} from "./anchor-poll-interval";

describe("resolveAnchorRefetchInterval (pure — spec: Anchor Submission and Polling)", () => {
  it("polls every 3000ms while ANCHORING", () => {
    expect(resolveAnchorRefetchInterval("ANCHORING", 0)).toBe(3000);
  });

  it("keeps polling while FAILED (transient — backend auto-retries FAILED->ANCHORING, so advance to CERTIFIED)", () => {
    expect(resolveAnchorRefetchInterval("FAILED", 0)).toBe(3000);
  });

  it("stops polling once CERTIFIED (the only truly terminal state)", () => {
    expect(resolveAnchorRefetchInterval("CERTIFIED", 0)).toBe(false);
  });

  it("does not poll while still READY (anchoring hasn't been submitted yet)", () => {
    expect(resolveAnchorRefetchInterval("READY", 0)).toBe(false);
  });

  it("does not poll for an unknown/undefined state (no data yet)", () => {
    expect(resolveAnchorRefetchInterval(undefined, 0)).toBe(false);
  });

  it("keeps polling one tick below the attempt cap", () => {
    expect(resolveAnchorRefetchInterval("ANCHORING", MAX_ANCHOR_POLL_ATTEMPTS - 1)).toBe(3000);
  });

  it("gives up (stops polling) once the attempt cap is reached, even while ANCHORING/FAILED (no infinite polling)", () => {
    expect(resolveAnchorRefetchInterval("ANCHORING", MAX_ANCHOR_POLL_ATTEMPTS)).toBe(false);
    expect(resolveAnchorRefetchInterval("FAILED", MAX_ANCHOR_POLL_ATTEMPTS)).toBe(false);
  });
});
