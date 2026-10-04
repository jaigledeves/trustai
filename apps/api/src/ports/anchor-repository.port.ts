import type { Anchor, AnchorStatus } from "../domain/anchor.entity";

export const ANCHOR_REPOSITORY_PORT = Symbol("AnchorRepositoryPort");

export interface AnchorSubmissionFields {
  txHash: string | null;
  status: AnchorStatus;
  blockTimestamp?: Date | null;
  chainId?: number | null;
  blockNumber?: bigint | null;
  contractAddress?: string | null;
}

export interface AnchorRepositoryPort {
  /**
   * Creates a new PENDING anchor row. Deliberately a plain, single-table
   * create (its own statement, not wrapped in the caller's transaction) —
   * see `TrustRecordRepositoryPort.submitForAnchoring`'s doc comment for
   * why: an orphaned PENDING anchor row (never referenced by a
   * TrustRecord, if the subsequent transaction fails) is harmless data,
   * unlike an orphaned job enqueue.
   */
  create(params: { chain: string; network: string }): Promise<Anchor>;

  findById(id: string): Promise<Anchor | null>;

  /**
   * Records the outcome of an `anchor-dtr`/`confirm-anchor` job. `txHash`
   * is `null` only for the `AlreadyAnchored` path (no new transaction was
   * ever submitted — blockchain-anchoring spec). `blockTimestamp` is set
   * once known: immediately for `AlreadyAnchored` (read from
   * `AnchorRegistry.anchoredAt()`), or once `ConfirmAnchorHandler`
   * observes >=2 confirmations (INV-32) for a freshly-submitted tx.
   *
   * `chainId`, `contractAddress` and `blockNumber` (phase C, C1) follow the
   * same rule as `blockTimestamp`: `undefined` leaves the column untouched.
   */
  updateSubmissionResult(id: string, fields: AnchorSubmissionFields): Promise<void>;
}
