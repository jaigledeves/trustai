import { ANCHOR_REGISTRY_DEPLOYMENTS } from "./anchor-registry.js";
import { sha256Hex } from "./hash.js";
import { ProofPackageV1Schema, verifyProofPackageAgainstFile } from "./proof-package.js";

/**
 * Independent verification of a dtr-2 record (roadmap C2/C4/C5, ADR-016):
 * the caller (the browser or the CLI) recomputes the hashes from the user's
 * file and the public proof package, then reads the AnchorRegistry contract
 * over a public RPC. Both run these exact steps. Nothing here trusts an
 * Ancrux verdict; the API only serves the proof, which the chain then
 * confirms or denies.
 *
 * Pure orchestration, browser-safe: no React, no fetch, no Node API, no chain
 * client. The caller injects `fetchProof` and a `ChainReader`. It never
 * throws: every failure becomes a step with `status: "failed"`, and every
 * failure is blocking: the steps after it are `skipped`. That includes a
 * non-PDF file (the coreHash commits to the mimeType, so it can never match)
 * and a file over `MAX_FILE_BYTES`. Steps carry codes and raw facts, never
 * copy (ADR-009): the web dictionary and the CLI own the wording.
 */

export type StepId = "file" | "proof" | "coreHash" | "anchorHash" | "network" | "contract" | "anchored";

export type StepStatus = "ok" | "failed" | "skipped";

export type StepCode =
  | "file_pdf"
  | "file_not_pdf"
  | "file_too_large"
  | "file_unreadable"
  | "proof_ok"
  | "proof_not_found"
  | "proof_legacy"
  | "proof_unavailable"
  | "proof_invalid"
  | "proof_fetch_error"
  | "proof_timeout"
  | "core_match"
  | "core_mismatch"
  | "core_invalid"
  | "anchor_hash_match"
  | "anchor_hash_mismatch"
  | "network_match"
  | "network_mismatch"
  | "contract_known"
  | "contract_unknown"
  | "anchored"
  | "not_anchored"
  | "rpc_error"
  | "skipped";

export type FactKey =
  | "sha256"
  | "sizeBytes"
  | "mimeType"
  | "coreHash"
  | "expectedCoreHash"
  | "actualCoreHash"
  | "anchorHash"
  | "declaredAnchorHash"
  | "computedAnchorHash"
  | "rpcChainId"
  | "proofChainId"
  | "contractAddress"
  | "knownContractAddress"
  | "anchoredAt"
  | "proofBlockTimestamp"
  | "txHash";

export interface StepFact {
  key: FactKey;
  value: string;
  /** Hashes and addresses: rendered in monospace, truncated with the full value available. */
  mono?: true;
}

export interface VerificationStep {
  id: StepId;
  status: StepStatus;
  code: StepCode;
  facts: StepFact[];
  /** Non-blocking caveat on an `ok` step. */
  warning?: "timestamp_mismatch";
}

export type VerificationOutcome = "verified" | "failed" | "legacy" | "not_found" | "unavailable";

export interface IndependentVerificationResult {
  outcome: VerificationOutcome;
  steps: VerificationStep[];
}

/** Read-only view of the AnchorRegistry contract on one RPC endpoint. */
export interface ChainReader {
  getChainId(): Promise<number>;
  isAnchored(contract: `0x${string}`, hash: `0x${string}`): Promise<boolean>;
  /** Block timestamp (seconds) of the anchor, 0 when not anchored. */
  anchoredAt(contract: `0x${string}`, hash: `0x${string}`): Promise<bigint>;
}

/**
 * Outcome of fetching the public proof package (`GET /public/verify/:id/proof`,
 * ADR-016), or of loading it from disk. The body stays unvalidated on purpose:
 * the orchestrator parses it with the strict `ProofPackageV1Schema`.
 */
export type ProofFetchResult =
  | { status: "ok"; body: unknown }
  | { status: "not_found" }
  /** 409 for a dtr-1 record: verified by the server only, no proof package. */
  | { status: "legacy" }
  /** Any other 409: not anchored yet, or no package can be produced. */
  | { status: "unavailable" };

export interface IndependentVerificationDeps {
  fetchProof(trustRecordId: string): Promise<ProofFetchResult>;
  chain: ChainReader;
}

export interface IndependentVerificationInput {
  trustRecordId: string;
  /**
   * A `File`/`Blob`, or anything that yields the raw bytes. `size`, when
   * known, lets an oversized file be rejected before it is read into memory.
   */
  file: { size?: number; arrayBuffer(): Promise<ArrayBuffer> };
}

/**
 * Largest file the check reads: the API's default upload cap
 * (`DEFAULT_MAX_UPLOAD_BYTES` in apps/api/src/modules/uploads/upload-limits.ts),
 * so nothing larger can have been certified.
 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Name of the error a timed-out `fetchProof` rejects with (`ProofFetchTimeoutError`, `AbortSignal.timeout`). */
const TIMEOUT_ERROR_NAME = "TimeoutError";

const STEP_ORDER: readonly StepId[] = [
  "file",
  "proof",
  "coreHash",
  "anchorHash",
  "network",
  "contract",
  "anchored",
];

/** Same signature check as the API's upload guard (`upload-limits.ts`). */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PDF_MIME_TYPE = "application/pdf";
const UNKNOWN_MIME_TYPE = "application/octet-stream";

function detectMimeType(bytes: Uint8Array): string {
  const isPdf = PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
  return isPdf ? PDF_MIME_TYPE : UNKNOWN_MIME_TYPE;
}

function mono(key: FactKey, value: string): StepFact {
  return { key, value, mono: true };
}

function secondsToIso(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toISOString();
}

/** Finishes the run: the remaining steps are skipped. */
function finish(steps: VerificationStep[], outcome: VerificationOutcome): IndependentVerificationResult {
  const done = new Set(steps.map((step) => step.id));
  const skipped = STEP_ORDER.filter((id) => !done.has(id)).map(
    (id): VerificationStep => ({ id, status: "skipped", code: "skipped", facts: [] }),
  );
  return { outcome, steps: [...steps, ...skipped] };
}

function tooLarge(sizeBytes: number): VerificationStep {
  return {
    id: "file",
    status: "failed",
    code: "file_too_large",
    facts: [{ key: "sizeBytes", value: String(sizeBytes) }],
  };
}

async function readFile(input: IndependentVerificationInput) {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  return { sha256: await sha256Hex(bytes), mimeType: detectMimeType(bytes), sizeBytes: bytes.byteLength };
}

export async function runIndependentVerification(
  input: IndependentVerificationInput,
  deps: IndependentVerificationDeps,
): Promise<IndependentVerificationResult> {
  const steps: VerificationStep[] = [];

  // a. The file, size-checked before it is read, then hashed locally.
  if (input.file.size !== undefined && input.file.size > MAX_FILE_BYTES) {
    steps.push(tooLarge(input.file.size));
    return finish(steps, "failed");
  }
  let file: Awaited<ReturnType<typeof readFile>>;
  try {
    file = await readFile(input);
  } catch {
    steps.push({ id: "file", status: "failed", code: "file_unreadable", facts: [] });
    return finish(steps, "failed");
  }
  if (file.sizeBytes > MAX_FILE_BYTES) {
    steps.push(tooLarge(file.sizeBytes));
    return finish(steps, "failed");
  }
  const isPdf = file.mimeType === PDF_MIME_TYPE;
  steps.push({
    id: "file",
    status: isPdf ? "ok" : "failed",
    code: isPdf ? "file_pdf" : "file_not_pdf",
    facts: [
      mono("sha256", file.sha256),
      { key: "mimeType", value: file.mimeType },
      { key: "sizeBytes", value: String(file.sizeBytes) },
    ],
  });
  if (!isPdf) {
    return finish(steps, "failed");
  }

  // b. The public proof package, parsed with the strict dtr-core schema.
  let fetched: ProofFetchResult;
  try {
    fetched = await deps.fetchProof(input.trustRecordId);
  } catch (error) {
    const timedOut = (error as { name?: unknown } | null)?.name === TIMEOUT_ERROR_NAME;
    steps.push({ id: "proof", status: "failed", code: timedOut ? "proof_timeout" : "proof_fetch_error", facts: [] });
    return finish(steps, "failed");
  }
  if (fetched.status === "legacy") {
    steps.push({ id: "proof", status: "skipped", code: "proof_legacy", facts: [] });
    return finish(steps, "legacy");
  }
  if (fetched.status === "unavailable") {
    steps.push({ id: "proof", status: "skipped", code: "proof_unavailable", facts: [] });
    return finish(steps, "unavailable");
  }
  if (fetched.status === "not_found") {
    steps.push({ id: "proof", status: "failed", code: "proof_not_found", facts: [] });
    return finish(steps, "not_found");
  }
  const parsed = ProofPackageV1Schema.safeParse(fetched.body);
  if (!parsed.success) {
    steps.push({ id: "proof", status: "failed", code: "proof_invalid", facts: [] });
    return finish(steps, "failed");
  }
  const proof = parsed.data;
  steps.push({
    id: "proof",
    status: "ok",
    code: "proof_ok",
    facts: [
      mono("coreHash", proof.dtr.coreHash),
      mono("anchorHash", proof.dtr.anchorHash),
      ...(proof.anchor.txHash ? [mono("txHash", proof.anchor.txHash)] : []),
    ],
  });

  // c. coreHash from the file, anchorHash from the package (dtr-core).
  const check = await verifyProofPackageAgainstFile(proof, file);
  if (check.status === "invalid_package") {
    steps.push({ id: "coreHash", status: "failed", code: "core_invalid", facts: [] });
    return finish(steps, "failed");
  }
  if (check.status === "core_mismatch") {
    steps.push({
      id: "coreHash",
      status: "failed",
      code: "core_mismatch",
      facts: [mono("expectedCoreHash", check.expectedCoreHash), mono("actualCoreHash", check.actualCoreHash)],
    });
    return finish(steps, "failed");
  }
  const coreHash = check.status === "verified" ? check.coreHash : proof.dtr.coreHash;
  steps.push({ id: "coreHash", status: "ok", code: "core_match", facts: [mono("coreHash", coreHash)] });
  if (check.status === "anchor_hash_mismatch") {
    steps.push({
      id: "anchorHash",
      status: "failed",
      code: "anchor_hash_mismatch",
      facts: [
        mono("declaredAnchorHash", check.declaredAnchorHash),
        mono("computedAnchorHash", check.computedAnchorHash),
      ],
    });
    return finish(steps, "failed");
  }
  steps.push({
    id: "anchorHash",
    status: "ok",
    code: "anchor_hash_match",
    facts: [mono("anchorHash", check.anchorHash)],
  });

  // d. The chain, read directly over the public RPC.
  const proofChainId = String(proof.anchor.chainId);
  let rpcChainId: number;
  try {
    rpcChainId = await deps.chain.getChainId();
  } catch {
    steps.push({ id: "network", status: "failed", code: "rpc_error", facts: [{ key: "proofChainId", value: proofChainId }] });
    return finish(steps, "failed");
  }
  const networkFacts: StepFact[] = [
    { key: "rpcChainId", value: String(rpcChainId) },
    { key: "proofChainId", value: proofChainId },
  ];
  if (rpcChainId !== proof.anchor.chainId) {
    steps.push({ id: "network", status: "failed", code: "network_mismatch", facts: networkFacts });
    return finish(steps, "failed");
  }
  steps.push({ id: "network", status: "ok", code: "network_match", facts: networkFacts });

  const contractAddress = proof.anchor.contractAddress as `0x${string}`;
  const known = ANCHOR_REGISTRY_DEPLOYMENTS.find((d) => d.chainId === proof.anchor.chainId);
  const contractFacts: StepFact[] = [
    mono("contractAddress", contractAddress),
    ...(known ? [mono("knownContractAddress", known.address)] : []),
  ];
  if (!known || known.address.toLowerCase() !== contractAddress.toLowerCase()) {
    steps.push({ id: "contract", status: "failed", code: "contract_unknown", facts: contractFacts });
    return finish(steps, "failed");
  }
  steps.push({ id: "contract", status: "ok", code: "contract_known", facts: contractFacts });

  const hash = `0x${check.anchorHash}` as const;
  let anchored: boolean;
  let anchoredAtSeconds: bigint;
  try {
    [anchored, anchoredAtSeconds] = await Promise.all([
      deps.chain.isAnchored(contractAddress, hash),
      deps.chain.anchoredAt(contractAddress, hash),
    ]);
  } catch {
    steps.push({ id: "anchored", status: "failed", code: "rpc_error", facts: [mono("anchorHash", check.anchorHash)] });
    return finish(steps, "failed");
  }
  if (!anchored) {
    steps.push({ id: "anchored", status: "failed", code: "not_anchored", facts: [mono("anchorHash", check.anchorHash)] });
    return finish(steps, "failed");
  }

  const anchoredAt = secondsToIso(anchoredAtSeconds);
  const proofTimestamp = proof.anchor.blockTimestamp;
  const sameSecond =
    proofTimestamp === null || Math.floor(Date.parse(proofTimestamp) / 1000) === Number(anchoredAtSeconds);
  steps.push({
    id: "anchored",
    status: "ok",
    code: "anchored",
    facts: [
      { key: "anchoredAt", value: anchoredAt },
      ...(proofTimestamp ? [{ key: "proofBlockTimestamp" as const, value: proofTimestamp }] : []),
    ],
    ...(sameSecond ? {} : { warning: "timestamp_mismatch" as const }),
  });

  // e. Verified independently only when every step passed.
  const allOk = steps.every((step) => step.status === "ok");
  return finish(steps, allOk ? "verified" : "failed");
}
