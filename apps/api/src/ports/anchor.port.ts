export const ANCHOR_PORT = Symbol("AnchorPort");

export interface AnchorSubmitResult {
  /**
   * `null` when `alreadyAnchored` is true — no new transaction was ever
   * submitted (the revert was caught at the simulation step, before any
   * gas was spent), so there is no new tx hash to report.
   */
  txHash: string | null;
  /**
   * blockchain-anchoring spec: "AlreadyAnchored revert treated as
   * success" — true when `AnchorRegistry.anchor()` would revert with
   * `AlreadyAnchored` for this hash. The caller (AnchorDtrHandler) treats
   * this as a successful, idempotent anchor, not a failure.
   */
  alreadyAnchored: boolean;
}

/**
 * Chain-agnostic anchoring port (design.md "Chain client" decision: viem,
 * `PublicClient`/`WalletClient` split makes this trivially fakeable in
 * unit tests without a real RPC).
 */
export interface AnchorPort {
  /**
   * Submits `canonicalHash` to `AnchorRegistry.anchor()`. Non-blocking
   * with respect to confirmations — returns once the transaction is
   * broadcast (or once an `AlreadyAnchored` revert is detected at
   * simulation time), never waits for it to be mined. Confirmation
   * polling is Phase 7's `ConfirmAnchorHandler`, not this port.
   */
  submitAnchor(canonicalHash: string): Promise<AnchorSubmitResult>;
}
