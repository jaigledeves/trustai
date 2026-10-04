import { ANCHOR_REGISTRY_ABI, type ChainReader } from "@trustai/dtr-core";
import { createPublicClient, http } from "viem";

/**
 * `ChainReader` over viem and a JSON-RPC endpoint. Read-only calls
 * (`eth_chainId`, `eth_call`): no wallet, no key, no gas. Same ABI and
 * timeout as the browser reader (apps/web/lib/verify/chain-reader.ts).
 */
export function createViemChainReader(rpcUrl: string): ChainReader {
  const client = createPublicClient({ transport: http(rpcUrl, { retryCount: 1, timeout: 10_000 }) });

  return {
    getChainId: () => client.getChainId(),
    isAnchored: (contract, hash) =>
      client.readContract({ address: contract, abi: ANCHOR_REGISTRY_ABI, functionName: "isAnchored", args: [hash] }),
    anchoredAt: (contract, hash) =>
      client.readContract({ address: contract, abi: ANCHOR_REGISTRY_ABI, functionName: "anchoredAt", args: [hash] }),
  };
}
