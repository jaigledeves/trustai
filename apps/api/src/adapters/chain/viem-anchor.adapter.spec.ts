import {
  BaseError,
  ContractFunctionRevertedError,
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
    expect(result).toEqual({ txHash: "0xtxhash123", alreadyAnchored: false });
  });

  it("CRITICAL: maps an AlreadyAnchored revert to success, never submitting a real transaction", async () => {
    const publicClient = buildFakePublicClient({
      simulateContract: vi.fn().mockRejectedValue(buildContractRevertError("AlreadyAnchored")),
    });
    const walletClient = buildFakeWalletClient();
    const adapter = new ViemAnchorAdapter({ publicClient, walletClient, contractAddress: CONTRACT_ADDRESS });

    const result = await adapter.submitAnchor(HASH);

    expect(result).toEqual({ txHash: null, alreadyAnchored: true });
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
});
