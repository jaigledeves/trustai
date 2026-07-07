import { Injectable } from "@nestjs/common";
import type { AnchorPort, AnchorSubmitResult } from "../../ports/anchor.port";

export class ChainNotConfiguredError extends Error {
  constructor() {
    super(
      "AnchorPort is not configured — set CHAIN_RPC_URL, WORKER_WALLET_PRIVATE_KEY, and " +
        "ANCHOR_CONTRACT_ADDRESS to enable on-chain anchoring",
    );
    this.name = "ChainNotConfiguredError";
  }
}

/**
 * Default `AnchorPort` when chain env vars aren't set (e.g. this sandbox —
 * no funded testnet wallet, no deployed contract). Mirrors the
 * `AI_ADAPTER` "stub" default pattern: the app boots and every other
 * feature works normally; only an actual anchor submission attempt fails,
 * with a clear, actionable error, rather than the whole app crashing at
 * boot because a factory couldn't construct a real viem client from
 * missing config.
 */
@Injectable()
export class ChainNotConfiguredAnchorAdapter implements AnchorPort {
  async submitAnchor(_canonicalHash: string): Promise<AnchorSubmitResult> {
    throw new ChainNotConfiguredError();
  }
}
