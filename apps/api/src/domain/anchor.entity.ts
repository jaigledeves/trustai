export enum AnchorStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

/** Zero framework imports (hexagonal domain layer). */
export class Anchor {
  constructor(
    public readonly id: string,
    public readonly chain: string,
    public readonly network: string,
    public readonly txHash: string | null,
    public readonly merkleRoot: string | null,
    public readonly blockTimestamp: Date | null,
    public readonly status: AnchorStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    /**
     * Phase C (C1): where the hash was anchored. Trailing and defaulted to
     * null so rows created before these columns existed stay valid.
     * `blockNumber` is null when the hash was already anchored before our
     * submission (no transaction of ours to read a block from).
     */
    public readonly chainId: number | null = null,
    public readonly blockNumber: bigint | null = null,
    public readonly contractAddress: string | null = null,
  ) {}
}
