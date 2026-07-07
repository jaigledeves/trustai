import type { Anchor, AnchorStatus } from "../domain/anchor.entity";

export const ANCHOR_REPOSITORY_PORT = Symbol("AnchorRepositoryPort");

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
   * Records the outcome of an `anchor-dtr` job's submission attempt.
   * `txHash` is `null` when the job's `AlreadyAnchored` path fired (no new
   * transaction was ever submitted — blockchain-anchoring spec).
   */
  updateSubmissionResult(
    id: string,
    fields: { txHash: string | null; status: AnchorStatus },
  ): Promise<void>;
}
