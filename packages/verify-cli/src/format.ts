import type { IndependentVerificationResult, StepCode, VerificationOutcome } from "@trustai/dtr-core";

/** Process exit codes, documented in the usage text and the README. */
export const EXIT_CODES = {
  verified: 0,
  notVerified: 1,
  usage: 2,
  cannotVerify: 3,
} as const;

export function exitCodeFor(outcome: VerificationOutcome): number {
  switch (outcome) {
    case "verified":
      return EXIT_CODES.verified;
    case "failed":
      return EXIT_CODES.notVerified;
    case "legacy":
    case "not_found":
    case "unavailable":
      return EXIT_CODES.cannotVerify;
  }
}

/** CLI wording for the orchestrator's step codes (the web keeps its own dictionary). */
const STEP_MESSAGES: Record<StepCode, string> = {
  file_pdf: "PDF file read and hashed locally",
  file_not_pdf: "the file is not a PDF, so its coreHash can never match",
  file_too_large: "the file exceeds the 10 MB limit and was not read",
  file_unreadable: "the file could not be read",
  proof_ok: "proof package parsed (ancrux-proof-1)",
  proof_not_found: "no record with this id",
  proof_legacy: "legacy dtr-1 record: no public proof package",
  proof_unavailable: "no proof package is available for this record yet",
  proof_invalid: "the proof package does not match the ancrux-proof-1 schema",
  proof_fetch_error: "the proof package could not be downloaded",
  proof_timeout: "the API did not answer in time",
  core_match: "coreHash recomputed from the file matches the proof",
  core_mismatch: "coreHash recomputed from the file does not match: it is not the certified file",
  core_invalid: "the proof package or the file facts are malformed",
  anchor_hash_match: "anchorHash recomputed from the proof matches the declared one",
  anchor_hash_mismatch: "anchorHash recomputed from the proof does not match the declared one",
  network_match: "the RPC node serves the chain named in the proof",
  network_mismatch: "the RPC node serves a different chain than the proof",
  contract_known: "the proof names the known AnchorRegistry deployment",
  contract_unknown: "the proof names an unknown contract",
  anchored: "anchorHash is anchored on the AnchorRegistry contract",
  not_anchored: "anchorHash is not anchored on the AnchorRegistry contract",
  rpc_error: "the RPC node could not be read",
  skipped: "skipped",
};

const TIMESTAMP_WARNING =
  "warning: the on-chain timestamp differs from the proof's blockTimestamp (the anchor itself is valid)";

/** Proof-package fields shown with the proof step that the orchestrator does not report. */
export interface ProofExtras {
  blockNumber?: string;
}

function finalLine(result: IndependentVerificationResult): string {
  switch (result.outcome) {
    case "verified":
      return "Result: VERIFIED independently (file, proof package and chain agree).";
    case "failed": {
      const failed = result.steps.find((step) => step.status === "failed");
      return `Result: NOT VERIFIED (step ${failed?.id ?? "unknown"} failed).`;
    }
    case "legacy":
      return "Result: CANNOT VERIFY INDEPENDENTLY: legacy dtr-1 record, verifiable only by the Ancrux server.";
    case "not_found":
      return "Result: CANNOT VERIFY: no record with this id.";
    case "unavailable":
      return "Result: CANNOT VERIFY INDEPENDENTLY: no proof package is available for this record yet.";
  }
}

/** Plain-text report: one block per step with its full facts, then a final line. */
export function formatText(result: IndependentVerificationResult, extras: ProofExtras = {}): string {
  const lines: string[] = [];
  for (const step of result.steps) {
    lines.push(`${`[${step.status}]`.padEnd(10)} ${step.id.padEnd(11)} ${STEP_MESSAGES[step.code]}`);
    const facts: [string, string][] = step.facts.map((fact) => [fact.key, fact.value]);
    if (step.id === "proof" && step.status === "ok" && extras.blockNumber) {
      facts.push(["blockNumber", extras.blockNumber]);
    }
    for (const [key, value] of facts) lines.push(`${" ".repeat(11)} ${key}: ${value}`);
    if (step.warning === "timestamp_mismatch") lines.push(`${" ".repeat(11)} ${TIMESTAMP_WARNING}`);
  }
  lines.push("", finalLine(result));
  return `${lines.join("\n")}\n`;
}

export function formatJson(result: IndependentVerificationResult): string {
  return `${JSON.stringify({ outcome: result.outcome, exitCode: exitCodeFor(result.outcome), steps: result.steps }, null, 2)}\n`;
}
