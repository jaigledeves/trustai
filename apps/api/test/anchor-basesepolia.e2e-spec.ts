import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
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
import { ANCHOR_REGISTRY_ABI } from "../src/adapters/chain/anchor-registry.abi";
import { ViemAnchorAdapter } from "../src/adapters/chain/viem-anchor.adapter";

// Load the api's real .env exactly as the app does at boot (ConfigModule
// populates process.env), so this suite exercises the SAME configuration a
// deployed worker would read — no test-only env plumbing.
await Test.createTestingModule({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
}).compile();

const RPC_URL = process.env.CHAIN_RPC_URL ?? "";
const PRIVATE_KEY = process.env.WORKER_WALLET_PRIVATE_KEY ?? "";
const CONTRACT_ADDRESS = process.env.ANCHOR_CONTRACT_ADDRESS ?? "";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "84532");

// Gated on real testnet secrets being present (mirrors anchor-chain's
// anvil gate). Skipped — not failed — in CI and any environment without a
// funded wallet + deployed contract, so the suite is safe to commit.
const configured = Boolean(RPC_URL && PRIVATE_KEY && CONTRACT_ADDRESS);

function randomHash(): `0x${string}` {
  return keccak256(toHex(`base-sepolia-e2e-${Date.now()}-${Math.random()}`));
}

/**
 * Live testnet integration test (blockchain-anchoring capability) against a
 * REAL deployed AnchorRegistry on Base Sepolia — the closest thing to the
 * tribunal demo's on-chain proof (MVP acceptance criteria #2/#3, docs/11).
 *
 * Drives the production `ViemAnchorAdapter` exactly as `AnchorDtrHandler`
 * would: it does NOT deploy a contract (unlike the anvil suite) — it targets
 * the persistent address in ANCHOR_CONTRACT_ADDRESS, submits a fresh random
 * hash, and independently confirms it on-chain via a plain contract read.
 *
 * Enable by setting CHAIN_RPC_URL, WORKER_WALLET_PRIVATE_KEY and
 * ANCHOR_CONTRACT_ADDRESS (CHAIN_ID defaults to 84532) in apps/api/.env.
 */
describe.skipIf(!configured)("AnchorPort live integration (Base Sepolia)", () => {
  let adapter: ViemAnchorAdapter;
  let publicClient: ReturnType<typeof createPublicClient>;

  beforeAll(() => {
    const chain: Chain = {
      id: CHAIN_ID,
      name: "base-sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    };
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

    adapter = new ViemAnchorAdapter({
      publicClient,
      walletClient,
      contractAddress: CONTRACT_ADDRESS as Address,
    });
  });

  it(
    "submits a real anchor transaction to Base Sepolia and the hash becomes queryable on-chain",
    async () => {
      const hash = randomHash();

      const result = await adapter.submitAnchor(hash);

      expect(result.alreadyAnchored).toBe(false);
      expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);

      // eslint-disable-next-line no-console -- surface the explorer link so
      // the on-chain proof is copy-pasteable from the test output.
      console.log(`Base Sepolia anchor tx: https://sepolia.basescan.org/tx/${result.txHash}`);

      // Wait for the tx to be mined, then verify independently via a plain
      // contract read — not just trusting the adapter's own report.
      await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

      // Read-after-write against a load-balanced public RPC (sepolia.base.org)
      // can briefly hit a node that hasn't yet caught up to the mined block,
      // returning a stale `false`. Poll with retries instead of a single read.
      let isAnchored = false;
      for (let attempt = 0; attempt < 20 && !isAnchored; attempt++) {
        isAnchored = await publicClient.readContract({
          address: CONTRACT_ADDRESS as Address,
          abi: ANCHOR_REGISTRY_ABI,
          functionName: "isAnchored",
          args: [hash],
        });
        if (!isAnchored) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      expect(isAnchored).toBe(true);
    },
    60_000,
  );
});
