import {
  BASE_SEPOLIA_ANCHOR_REGISTRY,
  computeDtr2AnchorHash,
  computeDtr2CoreHash,
  sha256Hex,
  type ChainReader,
  type ProofPackageV1,
} from "@trustai/dtr-core";
import { vi } from "vitest";

// Fields of the dtr-core golden dtr-2 fixture (packages/dtr-core/test/dtr2.test.ts
// and proof-package.test.ts). coreHash and anchorHash are recomputed for
// PDF_BYTES so the package describes a real file the CLI can read.
export const GOLDEN_ISSUED_AT = "2026-10-04T12:00:00.000Z";
export const GOLDEN_ENRICHMENT_HASH = "b19f7fe94680ca65d7d34eccbd099a1aef8702aa8a5f9d6331c8b00ba502c514";
export const GOLDEN_TRUST_RECORD_ID = "5b0c4f7e-6a1d-4c39-9f0e-2d8a7b1c3e45";
export const BLOCK_TIMESTAMP = "2026-10-04T12:00:14.000Z";
export const ANCHORED_AT_SECONDS = BigInt(Date.parse(BLOCK_TIMESTAMP) / 1000);

export const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nancrux-verify fixture\n");

export async function buildProof(bytes: Uint8Array = PDF_BYTES): Promise<ProofPackageV1> {
  const coreHash = await computeDtr2CoreHash({
    sha256: await sha256Hex(bytes),
    mimeType: "application/pdf",
    sizeBytes: bytes.byteLength,
  });
  const anchorHash = await computeDtr2AnchorHash({
    schemaVersion: "dtr-2",
    issuedAt: GOLDEN_ISSUED_AT,
    coreHash,
    enrichmentHash: GOLDEN_ENRICHMENT_HASH,
  });
  return {
    format: "ancrux-proof-1",
    trustRecordId: GOLDEN_TRUST_RECORD_ID,
    dtr: {
      schemaVersion: "dtr-2",
      issuedAt: GOLDEN_ISSUED_AT,
      coreHash,
      enrichmentHash: GOLDEN_ENRICHMENT_HASH,
      anchorHash,
    },
    algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
    anchor: {
      chainId: BASE_SEPOLIA_ANCHOR_REGISTRY.chainId,
      network: BASE_SEPOLIA_ANCHOR_REGISTRY.network,
      contractAddress: BASE_SEPOLIA_ANCHOR_REGISTRY.address,
      txHash: `0x${"ab".repeat(32)}`,
      blockNumber: "18734512",
      blockTimestamp: BLOCK_TIMESTAMP,
    },
  };
}

export function fakeChain(overrides: Partial<ChainReader> = {}): ChainReader {
  return {
    getChainId: vi.fn(async () => BASE_SEPOLIA_ANCHOR_REGISTRY.chainId),
    isAnchored: vi.fn(async () => true),
    anchoredAt: vi.fn(async () => ANCHORED_AT_SECONDS),
    ...overrides,
  };
}
