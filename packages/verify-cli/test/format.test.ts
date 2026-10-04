import type { IndependentVerificationResult, StepId, VerificationStep } from "@trustai/dtr-core";
import { describe, expect, it } from "vitest";
import { EXIT_CODES, exitCodeFor, formatJson, formatText } from "../src/format.js";

const ORDER: StepId[] = ["file", "proof", "coreHash", "anchorHash", "network", "contract", "anchored"];
const ANCHOR_HASH = "9f8c2d775d90c88594687f16ba2652fae2ffc184d5f77881ca01e14331eee0c9";
const TX_HASH = `0x${"ab".repeat(32)}`;

function skipped(id: StepId): VerificationStep {
  return { id, status: "skipped", code: "skipped", facts: [] };
}

function lastLine(text: string): string | undefined {
  return text.trimEnd().split("\n").at(-1);
}

const VERIFIED_STEPS: VerificationStep[] = [
  { id: "file", status: "ok", code: "file_pdf", facts: [{ key: "sha256", value: "a".repeat(64), mono: true }] },
  { id: "proof", status: "ok", code: "proof_ok", facts: [{ key: "txHash", value: TX_HASH, mono: true }] },
  { id: "coreHash", status: "ok", code: "core_match", facts: [] },
  { id: "anchorHash", status: "ok", code: "anchor_hash_match", facts: [{ key: "anchorHash", value: ANCHOR_HASH, mono: true }] },
  { id: "network", status: "ok", code: "network_match", facts: [{ key: "rpcChainId", value: "84532" }] },
  { id: "contract", status: "ok", code: "contract_known", facts: [] },
];

const VERIFIED: IndependentVerificationResult = {
  outcome: "verified",
  steps: [
    ...VERIFIED_STEPS,
    {
      id: "anchored",
      status: "ok",
      code: "anchored",
      facts: [{ key: "anchoredAt", value: "2026-10-04T12:00:14.000Z" }],
      warning: "timestamp_mismatch",
    },
  ],
};

describe("exitCodeFor", () => {
  it("maps each outcome to its documented exit code", () => {
    expect(exitCodeFor("verified")).toBe(0);
    expect(exitCodeFor("failed")).toBe(1);
    expect(exitCodeFor("legacy")).toBe(3);
    expect(exitCodeFor("not_found")).toBe(3);
    expect(exitCodeFor("unavailable")).toBe(3);
    expect(EXIT_CODES).toEqual({ verified: 0, notVerified: 1, usage: 2, cannotVerify: 3 });
  });
});

describe("formatText", () => {
  it("prints every step with its full facts and a verified final line", () => {
    const text = formatText(VERIFIED, { blockNumber: "18734512" });

    for (const id of ORDER) expect(text).toMatch(new RegExp(`\\[ok\\]\\s+${id}`));
    expect(text).toContain(`sha256: ${"a".repeat(64)}`);
    expect(text).toContain(`txHash: ${TX_HASH}`);
    expect(text).toContain("blockNumber: 18734512");
    expect(text).toContain("rpcChainId: 84532");
    expect(text).toContain("anchoredAt: 2026-10-04T12:00:14.000Z");
    expect(text).toContain("warning:");
    expect(lastLine(text)).toBe("Result: VERIFIED independently (file, proof package and chain agree).");
  });

  it("names the failed step and marks the rest as skipped", () => {
    const result: IndependentVerificationResult = {
      outcome: "failed",
      steps: [
        ...VERIFIED_STEPS,
        { id: "anchored", status: "failed", code: "not_anchored", facts: [{ key: "anchorHash", value: ANCHOR_HASH, mono: true }] },
      ],
    };
    const text = formatText(result);

    expect(text).toMatch(/\[failed\]\s+anchored/);
    expect(text).toContain("not anchored");
    expect(lastLine(text)).toBe("Result: NOT VERIFIED (step anchored failed).");
  });

  it("explains a legacy dtr-1 record instead of reporting a failure", () => {
    const result: IndependentVerificationResult = {
      outcome: "legacy",
      steps: [
        VERIFIED_STEPS[0]!,
        { id: "proof", status: "skipped", code: "proof_legacy", facts: [] },
        ...ORDER.slice(2).map(skipped),
      ],
    };
    const text = formatText(result);

    expect(text).toMatch(/\[skipped\]\s+coreHash/);
    expect(lastLine(text)).toBe(
      "Result: CANNOT VERIFY INDEPENDENTLY: legacy dtr-1 record, verifiable only by the Ancrux server.",
    );
  });
});

describe("formatJson", () => {
  it("prints the machine-readable result with its exit code", () => {
    expect(JSON.parse(formatJson(VERIFIED))).toEqual({ outcome: "verified", exitCode: 0, steps: VERIFIED.steps });
  });
});
