import {
  BaseError,
  ContractFunctionRevertedError,
  TransactionReceiptNotFoundError,
  encodeErrorResult,
  type PublicClient,
  type WalletClient,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { ANCHOR_REGISTRY_ABI } from "./anchor-registry.abi";
import { ViemAnchorAdapter } from "./viem-anchor.adapter";

const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const HASH = "a".repeat(64);
const HASH_0X = `0x${HASH}` as const;

function buildFakePublicClient(overrides: Partial<PublicClient> = {}): PublicClient {
  return {
    simulateContract: vi.fn(),
    ...overrides,
  } as unknown as PublicClient;
}

function buildFakeWalletClient(overrides: Partial<WalletClient> = {}): WalletClient {
  return {
    account: { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
    writeContract: vi.fn(),
    ...overrides,
  } as unknown as WalletClient;
}

/**
 * Builds a viem error shape matching a REAL simulateContract revert for a
 * named custom error — encodes genuine ABI-correct revert data via
 * `encodeErrorResult` (the same encoding a real node would return) rather
 * than a hand-faked shape, so this test exercises the actual decode path
 * `ViemAnchorAdapter` relies on.
 */
function buildContractRevertError(errorName: "AlreadyAnchored" | "ZeroHash"): BaseError {
  const args = errorName === "AlreadyAnchored" ? [HASH_0X] : undefined;
  const data = encodeErrorResult({
    abi: ANCHOR_REGISTRY_ABI,
    errorName,
    ...(args ? { args } : {}),
  } as never);
  const revertError = new ContractFunctionRevertedError({
    abi: ANCHOR_REGISTRY_ABI as never,
    data,
    functionName: "anchor",
  });
  return new BaseError("execution reverted", { cause: revertError });
}

describe("ViemAnchorAdapter (AnchorPort)", () => {
  it("submits the anchor tx on success and returns the txHash", async () => {
    const request = { fake: "simulated-request" };
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockResolvedValue({ request }),
    });
    const walletClient = buildFakeWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xtxhash123"),
    });
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    const result = await adapter.submitAnchor(HASH);

    expect(publicClient.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: CONTRACT_ADDRESS,
        functionName: "anchor",
        args: [HASH_0X],
      }),
    );
    expect(walletClient.writeContract).toHaveBeenCalledWith(request);
    expect(result).toEqual({
      txHash: "0xtxhash123",
      alreadyAnchored: false,
      anchoredAtBlockTimestamp: null,
    });
  });

  it("CRITICAL: maps an AlreadyAnchored revert to success, reads the original anchoredAt timestamp, never submits a real transaction", async () => {
    const anchoredAtSeconds = 1_800_000_000n; // 2027-01-15T... — arbitrary, just needs to be > 0
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockRejectedValue(buildContractRevertError("AlreadyAnchored")),
      readContract: vi.fn().mockResolvedValue(anchoredAtSeconds),
    });
    const walletClient = buildFakeWalletClient();
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    const result = await adapter.submitAnchor(HASH);

    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: CONTRACT_ADDRESS,
        functionName: "anchoredAt",
        args: [HASH_0X],
      }),
    );
    expect(result).toEqual({
      txHash: null,
      alreadyAnchored: true,
      anchoredAtBlockTimestamp: new Date(Number(anchoredAtSeconds) * 1000),
    });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it("propagates a ZeroHash revert as a real failure (not treated as success)", async () => {
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockRejectedValue(buildContractRevertError("ZeroHash")),
    });
    const walletClient = buildFakeWalletClient();
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    await expect(adapter.submitAnchor(HASH)).rejects.toThrow();
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it("propagates a generic/network error as a real failure", async () => {
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockRejectedValue(new Error("network timeout")),
    });
    const walletClient = buildFakeWalletClient();
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    await expect(adapter.submitAnchor(HASH)).rejects.toThrow("network timeout");
  });

  it("accepts a hash already prefixed with 0x", async () => {
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockResolvedValue({ request: {} }),
    });
    const walletClient = buildFakeWalletClient({
      writeContract: vi.fn().mockResolvedValue("0xtxhash456"),
    });
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    await adapter.submitAnchor(HASH_0X);

    expect(publicClient.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({ args: [HASH_0X] }),
    );
  });

  describe("getConfirmationStatus", () => {
    it("returns the confirmation count and block timestamp for a mined tx", async () => {
      const blockTimestampSeconds = 1_800_000_100n;
      const publicClient = buildFakePublicClient({
        getTransactionReceipt: vi.fn().mockResolvedValue({ blockNumber: 100n }),
        getBlockNumber: vi.fn().mockResolvedValue(102n), // 100 -> 102 = 3 confirmations
        getBlock: vi.fn().mockResolvedValue({ timestamp: blockTimestampSeconds }),
      });
      const walletClient = buildFakeWalletClient();
      const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

      const status = await adapter.getConfirmationStatus("0xsome-tx-hash");

      expect(status).toEqual({
        confirmations: 3,
        blockTimestamp: new Date(Number(blockTimestampSeconds) * 1000),
      });
    });

    it("returns 0 confirmations (not an error) when the tx isn't mined yet", async () => {
      const publicClient = buildFakePublicClient({
        getTransactionReceipt: vi.fn().mockRejectedValue(
          new TransactionReceiptNotFoundError({ hash: "0xsome-tx-hash" }),
        ),
      });
      const walletClient = buildFakeWalletClient();
      const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

      const status = await adapter.getConfirmationStatus("0xsome-tx-hash");

      expect(status).toEqual({ confirmations: 0, blockTimestamp: null });
    });

    it("propagates a genuine RPC/network error (not swallowed as '0 confirmations')", async () => {
      const publicClient = buildFakePublicClient({
        getTransactionReceipt: vi.fn().mockRejectedValue(new Error("RPC connection refused")),
      });
      const walletClient = buildFakeWalletClient();
      const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

      await expect(adapter.getConfirmationStatus("0xsome-tx-hash")).rejects.toThrow(
        "RPC connection refused",
      );
    });
  });

  describe("isAnchored", () => {
    it("returns anchored=true with the on-chain block timestamp when the hash was anchored", async () => {
      const anchoredAtSeconds = 1_800_000_200n;
      const publicClient = buildFakePublicClient({
        readContract: vi
          .fn()
          .mockResolvedValueOnce(true) // isAnchored
          .mockResolvedValueOnce(anchoredAtSeconds), // anchoredAt
      });
      const adapter = new ViemAnchorAdapter({
        publicClient,
        contractAddress: CONTRACT_ADDRESS,
      });

      const result = await adapter.isAnchored(HASH);

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: "isAnchored",
          args: [HASH_0X],
        }),
      );
      expect(result).toEqual({
        anchored: true,
        blockTimestamp: new Date(Number(anchoredAtSeconds) * 1000),
      });
    });

    it("returns anchored=false with no block timestamp when the hash was never submitted", async () => {
      const publicClient = buildFakePublicClient({
        readContract: vi.fn().mockResolvedValueOnce(false), // isAnchored
      });
      const adapter = new ViemAnchorAdapter({
        publicClient,
        contractAddress: CONTRACT_ADDRESS,
      });

      const result = await adapter.isAnchored(HASH);

      expect(result).toEqual({ anchored: false, blockTimestamp: null });
      // No side effects: anchoredAt is never read when isAnchored is false.
      expect(publicClient.readContract).toHaveBeenCalledTimes(1);
    });

    it("propagates an RPC/network error instead of swallowing it", async () => {
      const publicClient = buildFakePublicClient({
        readContract: vi.fn().mockRejectedValue(new Error("RPC connection refused")),
      });
      const adapter = new ViemAnchorAdapter({
        publicClient,
        contractAddress: CONTRACT_ADDRESS,
      });

      await expect(adapter.isAnchored(HASH)).rejects.toThrow("RPC connection refused");
    });

    it("does not require a walletClient (read-only, no wallet config needed)", async () => {
      const publicClient = buildFakePublicClient({
        readContract: vi.fn().mockResolvedValueOnce(false),
      });
      const adapter = new ViemAnchorAdapter({ publicClient, contractAddress: CONTRACT_ADDRESS });

      await expect(adapter.isAnchored(HASH)).resolves.toEqual({
        anchored: false,
        blockTimestamp: null,
      });
    });
  });

  describe("submitAnchor without a configured walletClient", () => {
    it("throws a clear error instead of a wallet-undefined crash", async () => {
      const publicClient = buildFakePublicClient();
      const adapter = new ViemAnchorAdapter({ publicClient, contractAddress: CONTRACT_ADDRESS });

      await expect(adapter.submitAnchor(HASH)).rejects.toThrow(
        "ViemAnchorAdapter.submitAnchor requires a configured walletClient",
      );
    });
  });
});
