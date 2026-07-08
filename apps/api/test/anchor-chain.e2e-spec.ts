import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, it } from "vitest";
import { ViemAnchorAdapter } from "../src/adapters/chain/viem-anchor.adapter";
import {
  anchorRegistryArtifactExists,
  readAnchorRegistryArtifact,
} from "./utils/anchor-registry-artifact";
import { ANVIL_RPC_URL, isAnvilAvailable } from "./utils/anvil-availability";

// Anvil's well-known default account #0 (mnemonic "test test test test
// test test test test test test test junk") — NOT a secret, this exact
// key is public knowledge baked into Foundry itself and only ever holds
// funds on ephemeral local anvil instances.
const ANVIL_DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const ANVIL_CHAIN_ID = 31337;

const [anvilAvailable, artifactExists] = await Promise.all([
  isAnvilAvailable(),
  Promise.resolve(anchorRegistryArtifactExists()),
]);

function randomHash(): `0x${string}` {
  return keccak256(toHex(`anchor-chain-e2e-${Date.now()}-${Math.random()}`));
}

/**
 * Chain integration test (blockchain-anchoring capability), gated on a
 * LOCAL anvil node — NOT Base Sepolia (no funded testnet wallet/RPC
 * secrets available in this environment). Deploys a fresh AnchorRegistry
 * instance to anvil per run and drives it through `ViemAnchorAdapter`
 * exactly as `AnchorDtrHandler` would in production — this is the closest
 * thing to a real end-to-end proof of the adapter short of a live testnet.
 *
 * Start anvil manually before running this suite: `anvil` (default port
 * 8545). Skipped gracefully — not failed — if anvil isn't reachable, or
 * if `smart-contracts/out/` hasn't been built yet (`forge build`).
 */
describe.skipIf(!anvilAvailable || !artifactExists)(
  "AnchorPort chain integration (local anvil)",
  () => {
    let contractAddress: Address;
    let adapter: ViemAnchorAdapter;
    let publicClient: ReturnType<typeof createPublicClient>;

    beforeAll(async () => {
      const chain: Chain = {
        id: ANVIL_CHAIN_ID,
        name: "anvil",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [ANVIL_RPC_URL] } },
      };
      const account = privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY);
      publicClient = createPublicClient({ chain, transport: http(ANVIL_RPC_URL) });
      const walletClient = createWalletClient({ account, chain, transport: http(ANVIL_RPC_URL) });

      const { abi, bytecode } = readAnchorRegistryArtifact();
      const deployTxHash = await walletClient.deployContract({ abi, bytecode, args: [] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
      if (!receipt.contractAddress) {
        throw new Error("AnchorRegistry deployment to anvil did not return a contract address");
      }
      contractAddress = receipt.contractAddress;

      adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress });
    }, 30_000);

    it("submits a real anchor transaction and the hash becomes queryable on-chain", async () => {
      const hash = randomHash();

      const result = await adapter.submitAnchor(hash);

      expect(result.alreadyAnchored).toBe(false);
      expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);

      // Wait for the tx to be mined, then verify independently via a
      // plain contract read — not just trusting the adapter's own report.
      await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });
      const { ANCHOR_REGISTRY_ABI } = await import("../src/adapters/chain/anchor-registry.abi");
      const isAnchored = await publicClient.readContract({
        address: contractAddress,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "isAnchored",
        args: [hash],
      });
      expect(isAnchored).toBe(true);
    });

    it("CRITICAL: re-submitting the same hash hits AlreadyAnchored, mapped to success with no new tx (idempotent, durability-relevant)", async () => {
      const hash = randomHash();

      const first = await adapter.submitAnchor(hash);
      expect(first.alreadyAnchored).toBe(false);
      await publicClient.waitForTransactionReceipt({ hash: first.txHash as `0x${string}` });

      // Simulates a worker restart re-processing the same anchor-dtr job
      // (RNF-022 durability: "no duplicate on-chain submission occurs for
      // the same canonicalHash").
      const second = await adapter.submitAnchor(hash);

      expect(second).toEqual({ txHash: null, alreadyAnchored: true });
    });

    it("a different hash anchors independently (distinct tx from a previously-anchored hash)", async () => {
      const hashA = randomHash();
      const hashB = randomHash();

      const resultA = await adapter.submitAnchor(hashA);
      const resultB = await adapter.submitAnchor(hashB);

      expect(resultA.alreadyAnchored).toBe(false);
      expect(resultB.alreadyAnchored).toBe(false);
      expect(resultB.txHash).not.toBe(resultA.txHash);
    });
  },
);
