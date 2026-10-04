import { describe, expect, it, vi } from "vitest";
import {
  BASE_SEPOLIA_ANCHOR_REGISTRY,
  MAX_FILE_BYTES,
  computeDtr2AnchorHash,
  computeDtr2CoreHash,
  runIndependentVerification,
  sha256Hex,
  type ChainReader,
  type IndependentVerificationResult,
  type ProofFetchResult,
  type ProofPackageV1,
  type StepId,
} from "../src/index.js";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nindependent verification fixture\n");
const ISSUED_AT = "2026-10-04T12:00:00.000Z";
const ENRICHMENT_HASH = "b".repeat(64);
const BLOCK_TIMESTAMP = "2026-10-04T12:00:14.000Z";
const ANCHORED_AT_SECONDS = BigInt(Date.parse(BLOCK_TIMESTAMP) / 1000);

function blobOf(bytes: Uint8Array) {
  return { arrayBuffer: async () => bytes.slice().buffer };
}

async function buildProof(bytes: Uint8Array = PDF_BYTES): Promise<ProofPackageV1> {
  const sha256 = await sha256Hex(bytes);
  const coreHash = await computeDtr2CoreHash({
    sha256,
    mimeType: "application/pdf",
    sizeBytes: bytes.byteLength,
  });
  const anchorHash = await computeDtr2AnchorHash({
    schemaVersion: "dtr-2",
    issuedAt: ISSUED_AT,
    coreHash,
    enrichmentHash: ENRICHMENT_HASH,
  });
  return {
    format: "ancrux-proof-1",
    trustRecordId: "rec-1",
    dtr: { schemaVersion: "dtr-2", issuedAt: ISSUED_AT, coreHash, enrichmentHash: ENRICHMENT_HASH, anchorHash },
    algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
    anchor: {
      chainId: 84532,
      network: "base-sepolia",
      contractAddress: BASE_SEPOLIA_ANCHOR_REGISTRY.address.toLowerCase(),
      txHash: `0x${"ab".repeat(32)}`,
      blockNumber: "18734512",
      blockTimestamp: BLOCK_TIMESTAMP,
    },
  };
}

function fakeChain(overrides: Partial<ChainReader> = {}): ChainReader {
  return {
    getChainId: vi.fn(async () => 84532),
    isAnchored: vi.fn(async () => true),
    anchoredAt: vi.fn(async () => ANCHORED_AT_SECONDS),
    ...overrides,
  };
}

async function run(options: {
  proof?: ProofFetchResult | (() => Promise<ProofFetchResult>);
  chain?: ChainReader;
  bytes?: Uint8Array;
}): Promise<IndependentVerificationResult> {
  const proof = options.proof ?? { status: "ok", body: await buildProof() };
  const fetchProof = typeof proof === "function" ? proof : async () => proof;
  return runIndependentVerification(
    { trustRecordId: "rec-1", file: blobOf(options.bytes ?? PDF_BYTES) },
    { fetchProof, chain: options.chain ?? fakeChain() },
  );
}

function statuses(result: IndependentVerificationResult): Record<StepId, string> {
  return Object.fromEntries(result.steps.map((step) => [step.id, step.status])) as Record<
    StepId,
    string
  >;
}

function step(result: IndependentVerificationResult, id: StepId) {
  const found = result.steps.find((s) => s.id === id);
  if (!found) throw new Error(`missing step ${id}`);
  return found;
}

const STEP_ORDER: StepId[] = ["file", "proof", "coreHash", "anchorHash", "network", "contract", "anchored"];

describe("runIndependentVerification", () => {
  it("verifies independently when every step passes, in a fixed order", async () => {
    const chain = fakeChain();
    const proof = await buildProof();
    const result = await run({ proof: { status: "ok", body: proof }, chain });

    expect(result.outcome).toBe("verified");
    expect(result.steps.map((s) => s.id)).toEqual(STEP_ORDER);
    expect(result.steps.every((s) => s.status === "ok")).toBe(true);
    expect(step(result, "file").facts).toEqual(
      expect.arrayContaining([
        { key: "sha256", value: await sha256Hex(PDF_BYTES), mono: true },
        { key: "mimeType", value: "application/pdf" },
        { key: "sizeBytes", value: String(PDF_BYTES.byteLength) },
      ]),
    );
    expect(chain.isAnchored).toHaveBeenCalledWith(
      proof.anchor.contractAddress,
      `0x${proof.dtr.anchorHash}`,
    );
    expect(step(result, "anchored").warning).toBeUndefined();
  });

  it("fails coreHash when the file is not the certified one and skips the rest", async () => {
    const proof = await buildProof(new TextEncoder().encode("%PDF-1.7\nanother file\n"));
    const result = await run({ proof: { status: "ok", body: proof } });

    expect(result.outcome).toBe("failed");
    expect(statuses(result)).toMatchObject({
      file: "ok",
      proof: "ok",
      coreHash: "failed",
      anchorHash: "skipped",
      network: "skipped",
      contract: "skipped",
      anchored: "skipped",
    });
    expect(step(result, "coreHash").code).toBe("core_mismatch");
  });

  it("fails anchorHash when the package is not self-consistent", async () => {
    const proof = await buildProof();
    proof.dtr.anchorHash = "c".repeat(64);
    const chain = fakeChain();
    const result = await run({ proof: { status: "ok", body: proof }, chain });

    expect(result.outcome).toBe("failed");
    expect(statuses(result)).toMatchObject({ coreHash: "ok", anchorHash: "failed", network: "skipped" });
    expect(step(result, "anchorHash").code).toBe("anchor_hash_mismatch");
    expect(chain.getChainId).not.toHaveBeenCalled();
  });

  it("fails the network step when the RPC serves another chain", async () => {
    const chain = fakeChain({ getChainId: vi.fn(async () => 1) });
    const result = await run({ chain });

    expect(result.outcome).toBe("failed");
    expect(statuses(result)).toMatchObject({ network: "failed", contract: "skipped", anchored: "skipped" });
    expect(step(result, "network").code).toBe("network_mismatch");
    expect(step(result, "network").facts).toEqual(
      expect.arrayContaining([
        { key: "rpcChainId", value: "1" },
        { key: "proofChainId", value: "84532" },
      ]),
    );
    expect(chain.isAnchored).not.toHaveBeenCalled();
  });

  it("fails the contract step when the proof points to an unknown contract", async () => {
    const proof = await buildProof();
    proof.anchor.contractAddress = `0x${"1".repeat(40)}`;
    const chain = fakeChain();
    const result = await run({ proof: { status: "ok", body: proof }, chain });

    expect(result.outcome).toBe("failed");
    expect(statuses(result)).toMatchObject({ network: "ok", contract: "failed", anchored: "skipped" });
    expect(step(result, "contract").code).toBe("contract_unknown");
    expect(chain.isAnchored).not.toHaveBeenCalled();
  });

  it("fails when the chain says the anchorHash is not anchored", async () => {
    const result = await run({ chain: fakeChain({ isAnchored: vi.fn(async () => false) }) });

    expect(result.outcome).toBe("failed");
    expect(step(result, "anchored")).toMatchObject({ status: "failed", code: "not_anchored" });
  });

  it("turns an RPC error into a failed chain step instead of throwing", async () => {
    const chain = fakeChain({
      getChainId: vi.fn(async () => {
        throw new Error("fetch failed");
      }),
    });
    const result = await run({ chain });

    expect(result.outcome).toBe("failed");
    expect(step(result, "network")).toMatchObject({ status: "failed", code: "rpc_error" });
    expect(statuses(result)).toMatchObject({ contract: "skipped", anchored: "skipped" });
  });

  it("turns an RPC error on the anchor read into a failed anchored step", async () => {
    const chain = fakeChain({
      isAnchored: vi.fn(async () => {
        throw new Error("timeout");
      }),
    });
    const result = await run({ chain });

    expect(result.outcome).toBe("failed");
    expect(step(result, "anchored")).toMatchObject({ status: "failed", code: "rpc_error" });
  });

  it("keeps an anchored record verified but flags a timestamp that differs from the proof", async () => {
    const chain = fakeChain({ anchoredAt: vi.fn(async () => ANCHORED_AT_SECONDS + 5n) });
    const result = await run({ chain });

    expect(result.outcome).toBe("verified");
    const anchored = step(result, "anchored");
    expect(anchored.status).toBe("ok");
    expect(anchored.warning).toBe("timestamp_mismatch");
    expect(anchored.facts).toEqual(
      expect.arrayContaining([
        { key: "anchoredAt", value: "2026-10-04T12:00:19.000Z" },
        { key: "proofBlockTimestamp", value: BLOCK_TIMESTAMP },
      ]),
    );
  });

  it("reports a legacy dtr-1 record as legacy, not as a failure", async () => {
    const chain = fakeChain();
    const result = await run({ proof: { status: "legacy" }, chain });

    expect(result.outcome).toBe("legacy");
    expect(step(result, "proof")).toMatchObject({ status: "skipped", code: "proof_legacy" });
    expect(statuses(result)).toMatchObject({ coreHash: "skipped", anchored: "skipped" });
    expect(chain.getChainId).not.toHaveBeenCalled();
  });

  it("reports an unknown record as not found", async () => {
    const result = await run({ proof: { status: "not_found" } });

    expect(result.outcome).toBe("not_found");
    expect(step(result, "proof")).toMatchObject({ status: "failed", code: "proof_not_found" });
  });

  it("reports a record without a proof package (409) as unavailable", async () => {
    const result = await run({ proof: { status: "unavailable" } });

    expect(result.outcome).toBe("unavailable");
    expect(step(result, "proof")).toMatchObject({ status: "skipped", code: "proof_unavailable" });
  });

  it("fails the proof step when the package does not match the strict schema", async () => {
    const proof = { ...(await buildProof()), extra: true };
    const result = await run({ proof: { status: "ok", body: proof } });

    expect(result.outcome).toBe("failed");
    expect(step(result, "proof")).toMatchObject({ status: "failed", code: "proof_invalid" });
  });

  it("fails the proof step when the request itself fails", async () => {
    const result = await run({
      proof: async () => {
        throw new TypeError("Failed to fetch");
      },
    });

    expect(result.outcome).toBe("failed");
    expect(step(result, "proof")).toMatchObject({ status: "failed", code: "proof_fetch_error" });
  });

  it("fails the proof step with a timeout code when the API does not answer in time", async () => {
    const result = await run({
      proof: async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      },
    });

    expect(result.outcome).toBe("failed");
    expect(step(result, "proof")).toMatchObject({ status: "failed", code: "proof_timeout" });
    expect(statuses(result)).toMatchObject({ coreHash: "skipped", anchored: "skipped" });
  });

  it("stops at a non-PDF file: the coreHash can never match, so the rest is skipped", async () => {
    const bytes = new TextEncoder().encode("plain text, not a pdf");
    const fetchProof = vi.fn(async (): Promise<ProofFetchResult> => ({ status: "ok", body: await buildProof() }));
    const result = await run({ bytes, proof: fetchProof });

    expect(result.outcome).toBe("failed");
    expect(step(result, "file")).toMatchObject({ status: "failed", code: "file_not_pdf" });
    expect(step(result, "file").facts).toEqual(
      expect.arrayContaining([{ key: "mimeType", value: "application/octet-stream" }]),
    );
    expect(result.steps.slice(1).every((s) => s.status === "skipped")).toBe(true);
    expect(fetchProof).not.toHaveBeenCalled();
  });

  it("rejects a file above the 10 MB cap before reading it into memory", async () => {
    const arrayBuffer = vi.fn(async () => PDF_BYTES.slice().buffer);
    const fetchProof = vi.fn(async (): Promise<ProofFetchResult> => ({ status: "not_found" }));
    const result = await runIndependentVerification(
      { trustRecordId: "rec-1", file: { size: MAX_FILE_BYTES + 1, arrayBuffer } },
      { fetchProof, chain: fakeChain() },
    );

    expect(result.outcome).toBe("failed");
    expect(step(result, "file")).toMatchObject({
      status: "failed",
      code: "file_too_large",
      facts: [{ key: "sizeBytes", value: String(MAX_FILE_BYTES + 1) }],
    });
    expect(result.steps.slice(1).every((s) => s.status === "skipped")).toBe(true);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(fetchProof).not.toHaveBeenCalled();
  });

  it("rejects an oversized file after reading it when its size was not known up front", async () => {
    const bytes = new Uint8Array(MAX_FILE_BYTES + 1);
    const fetchProof = vi.fn(async (): Promise<ProofFetchResult> => ({ status: "not_found" }));
    const result = await runIndependentVerification(
      { trustRecordId: "rec-1", file: blobOf(bytes) },
      { fetchProof, chain: fakeChain() },
    );

    expect(step(result, "file")).toMatchObject({ status: "failed", code: "file_too_large" });
    expect(fetchProof).not.toHaveBeenCalled();
  });

  it("accepts a file exactly at the 10 MB cap", async () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    const result = await runIndependentVerification(
      { trustRecordId: "rec-1", file: { size: MAX_FILE_BYTES, ...blobOf(PDF_BYTES) } },
      { fetchProof: async () => ({ status: "ok", body: await buildProof() }), chain: fakeChain() },
    );

    expect(step(result, "file")).toMatchObject({ status: "ok", code: "file_pdf" });
  });

  it("fails the file step when the file cannot be read", async () => {
    const result = await runIndependentVerification(
      {
        trustRecordId: "rec-1",
        file: {
          arrayBuffer: async () => {
            throw new Error("NotReadableError");
          },
        },
      },
      { fetchProof: async () => ({ status: "ok", body: await buildProof() }), chain: fakeChain() },
    );

    expect(result.outcome).toBe("failed");
    expect(step(result, "file")).toMatchObject({ status: "failed", code: "file_unreadable" });
    expect(result.steps.slice(1).every((s) => s.status === "skipped")).toBe(true);
  });
});
