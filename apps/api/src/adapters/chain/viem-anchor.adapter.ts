import { Injectable, Logger } from "@nestjs/common";
import {
  BaseError,
  ContractFunctionRevertedError,
  TransactionReceiptNotFoundError,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import type {
  AnchorExistenceStatus,
  AnchorPort,
  AnchorSubmitResult,
  ConfirmationStatus,
} from "../../ports/anchor.port";
import { ANCHOR_REGISTRY_ABI } from "./anchor-registry.abi";

export interface ViemAnchorAdapterConfig {
  publicClient: PublicClient;
  /**
   * design.md "ViemAnchorAdapterConfig.walletClient" decision: optional —
   * least privilege. A read-only consumer (public verification's
   * `isAnchored`/`getConfirmationStatus`) must not require the worker's
   * private key. `submitAnchor` throws a clear error if called without it.
   */
  walletClient?: WalletClient;
  contractAddress: Address;
}

/**
 * design.md "Chain client" decision: viem's `PublicClient`/`WalletClient`
 * split makes this trivially fakeable in unit tests (no real RPC needed).
 *
 * Uses the standard viem simulate-then-write pattern: `simulateContract`
 * is a free `eth_call` (no gas spent) that both validates the call WOULD
 * succeed and lets us catch a revert (including `AlreadyAnchored`) before
 * ever broadcasting a real transaction. Only calls that pass simulation
 * reach `writeContract`.
 */
@Injectable()
export class ViemAnchorAdapter implements AnchorPort {
  private readonly logger = new Logger(ViemAnchorAdapter.name);

  constructor(private readonly config: ViemAnchorAdapterConfig) {}

  async submitAnchor(canonicalHash: string): Promise<AnchorSubmitResult> {
    if (!this.config.walletClient) {
      throw new Error(
        "ViemAnchorAdapter.submitAnchor requires a configured walletClient — this instance was " +
          "constructed read-only (no wallet), only isAnchored/getConfirmationStatus are available",
      );
    }
    const walletClient = this.config.walletClient;
    const hashBytes32 = this.toBytes32(canonicalHash);

    try {
      const { request } = await this.config.publicClient.simulateContract({
        address: this.config.contractAddress,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "anchor",
        args: [hashBytes32],
        account: walletClient.account,
      });

      const txHash = await walletClient.writeContract(request);
      return { txHash, alreadyAnchored: false, anchoredAtBlockTimestamp: null };
    } catch (err) {
      if (this.isAlreadyAnchoredRevert(err)) {
        const anchoredAtSeconds = await this.config.publicClient.readContract({
          address: this.config.contractAddress,
          abi: ANCHOR_REGISTRY_ABI,
          functionName: "anchoredAt",
          args: [hashBytes32],
        });
        const anchoredAtBlockTimestamp =
          anchoredAtSeconds > 0n ? new Date(Number(anchoredAtSeconds) * 1000) : null;

        this.logger.log(
          `Hash already anchored on-chain, treating as success (no tx submitted): ${canonicalHash}`,
        );
        return { txHash: null, alreadyAnchored: true, anchoredAtBlockTimestamp };
      }
      throw err;
    }
  }

  async getConfirmationStatus(txHash: string): Promise<ConfirmationStatus> {
    try {
      const receipt = await this.config.publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      const currentBlock = await this.config.publicClient.getBlockNumber();
      const confirmations = Number(currentBlock - receipt.blockNumber + 1n);
      const block = await this.config.publicClient.getBlock({ blockNumber: receipt.blockNumber });
      return { confirmations, blockTimestamp: new Date(Number(block.timestamp) * 1000) };
    } catch (err) {
      // Not mined yet (or the RPC hasn't caught up) — this is a normal,
      // expected state while polling, not a failure. The caller's own
      // timeout logic decides when to give up waiting.
      if (err instanceof TransactionReceiptNotFoundError) {
        return { confirmations: 0, blockTimestamp: null };
      }
      throw err;
    }
  }

  async isAnchored(canonicalHash: string): Promise<AnchorExistenceStatus> {
    const hashBytes32 = this.toBytes32(canonicalHash);

    const anchored = await this.config.publicClient.readContract({
      address: this.config.contractAddress,
      abi: ANCHOR_REGISTRY_ABI,
      functionName: "isAnchored",
      args: [hashBytes32],
    });

    if (!anchored) {
      return { anchored: false, blockTimestamp: null };
    }

    const anchoredAtSeconds = await this.config.publicClient.readContract({
      address: this.config.contractAddress,
      abi: ANCHOR_REGISTRY_ABI,
      functionName: "anchoredAt",
      args: [hashBytes32],
    });
    const blockTimestamp =
      anchoredAtSeconds > 0n ? new Date(Number(anchoredAtSeconds) * 1000) : null;

    return { anchored: true, blockTimestamp };
  }

  private isAlreadyAnchoredRevert(err: unknown): boolean {
    if (!(err instanceof BaseError)) {
      return false;
    }
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    return (
      revertError instanceof ContractFunctionRevertedError &&
      revertError.data?.errorName === "AlreadyAnchored"
    );
  }

  private toBytes32(hexHash: string): `0x${string}` {
    return hexHash.startsWith("0x") ? (hexHash as `0x${string}`) : `0x${hexHash}`;
  }
}
