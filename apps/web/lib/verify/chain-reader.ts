import { ANCHOR_REGISTRY_ABI, type ChainReader } from "@trustai/dtr-core";
import { createPublicClient, http } from "viem";

/**
 * `ChainReader` over viem and a public JSON-RPC endpoint
 * (`NEXT_PUBLIC_CHAIN_RPC_URL`). Read-only calls (`eth_chainId`, `eth_call`):
 * no wallet, no key, no gas. The ABI comes from dtr-core, the same one the
 * API and the CLI use. Kept apart from the orchestrator so the UI can load
 * viem lazily, only when a visitor runs the check.
 */
export function createViemChainReader(rpcUrl: string): ChainReader {
  const client = createPublicClient({
    transport: http(rpcUrl, { retryCount: 1, timeout: 10_000 }),
  });

  return {
    getChainId: () => client.getChainId(),
    isAnchored: (contract, hash) =>
      client.readContract({
        address: contract,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "isAnchored",
        args: [hash],
      }),
    anchoredAt: (contract, hash) =>
      client.readContract({
        address: contract,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "anchoredAt",
        args: [hash],
      }),
  };
}
