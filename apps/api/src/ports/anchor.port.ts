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
  /**
   * Populated ONLY when `alreadyAnchored` is true — the on-chain block
   * timestamp (`AnchorRegistry.anchoredAt()`) at which this hash was
   * originally anchored. `null` for a freshly-submitted tx (Phase 7's
   * `ConfirmAnchorHandler` determines this later, once mined+confirmed).
   */
  anchoredAtBlockTimestamp: Date | null;
}

export interface ConfirmationStatus {
  /** 0 while the tx isn't mined yet (or the receipt can't be found yet). */
  confirmations: number;
  /** The tx's block timestamp — `null` until it has at least 1 confirmation. */
  blockTimestamp: Date | null;
}

export interface AnchorExistenceStatus {
  anchored: boolean;
  /**
   * The on-chain block timestamp the hash was anchored at
   * (`AnchorRegistry.anchoredAt()`). `null` when `anchored` is false — there
   * is nothing to read. design.md "AnchorPort.isAnchored shape": no
   * `txHash` here — `AnchorRegistry` has no hash->txHash getter; callers
   * that need `txHash` already have it from the DB `Anchor` row.
   */
  blockTimestamp: Date | null;
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
   * polling for a freshly-submitted tx is `getConfirmationStatus`, called
   * by `ConfirmAnchorHandler`, not this method.
   */
  submitAnchor(canonicalHash: string): Promise<AnchorSubmitResult>;

  /**
   * INV-32: `ConfirmAnchorHandler` polls this until `confirmations >= 2`
   * (or a timeout elapses). Returns `{ confirmations: 0, blockTimestamp: null }`
   * — not an error — while the transaction isn't mined yet; the caller's
   * timeout logic (not this port) decides when to give up.
   */
  getConfirmationStatus(txHash: string): Promise<ConfirmationStatus>;

  /**
   * blockchain-anchoring spec (delta) "Read-Only Anchor Existence Check":
   * a read against `AnchorRegistry.isAnchored()`/`anchoredAt()` — no
   * wallet, no transaction, never mutates chain state. Used by public
   * verification (UC-02) to corroborate a `canonicalHash` on-chain
   * without needing the worker's private key.
   */
  isAnchored(canonicalHash: string): Promise<AnchorExistenceStatus>;
}
