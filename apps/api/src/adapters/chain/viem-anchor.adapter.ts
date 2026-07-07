import { Injectable, Logger } from "@nestjs/common";
import {
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { AnchorPort, AnchorSubmitResult } from "../../ports/anchor.port";
import { ANCHOR_REGISTRY_ABI } from "./anchor-registry.abi";

export interface ViemAnchorAdapterConfig {
  publicClient: PublicClient;
  walletClient: WalletClient;
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
    const hashBytes32 = this.toBytes32(canonicalHash);

    try {
      const { request } = await this.config.publicClient.simulateContract({
        address: this.config.contractAddress,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "anchor",
        args: [hashBytes32],
        account: this.config.walletClient.account,
      });

      const txHash = await this.config.walletClient.writeContract(request);
      return { txHash, alreadyAnchored: false };
    } catch (err) {
      if (this.isAlreadyAnchoredRevert(err)) {
        this.logger.log(
          `Hash already anchored on-chain, treating as success (no tx submitted): ${canonicalHash}`,
        );
        return { txHash: null, alreadyAnchored: true };
      }
      throw err;
    }
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
