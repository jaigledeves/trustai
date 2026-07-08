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
  ) {}
}
