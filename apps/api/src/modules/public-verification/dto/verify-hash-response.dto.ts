import { ApiProperty } from "@nestjs/swagger";
import type { VerificationAttemptVerdict } from "../../../ports/verification-attempt-repository.port";

const VERDICT_VALUES: readonly VerificationAttemptVerdict[] = [
  "VALID",
  "ASSET_MISMATCH",
  "INVALID_RECORD",
  "PENDING_ANCHOR",
];

export class ChainAnchorResponseDto {
  @ApiProperty()
  anchored!: boolean;

  @ApiProperty({ nullable: true, type: String })
  txHash!: string | null;

  @ApiProperty({ nullable: true, type: Date })
  blockTimestamp!: Date | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Block explorer link for txHash — null when there is no txHash yet.",
  })
  explorerUrl!: string | null;

  @ApiProperty({
    description:
      "True when AnchorPort.isAnchored's on-chain read failed and this fell back to the DB " +
      "Anchor.status (spec: 'On-Chain Read Failure Never Fails the Request').",
  })
  chainReadUnavailable!: boolean;
}

/**
 * public-verification spec "Hash-Only View Without Existence Leakage"
 * (RF-042, INV-41): GET's response — existence, state, and anchor verdict
 * only. Deliberately has NO `analysis` field at all (not even `null`) so
 * the DTO shape itself enforces INV-41 at the type level, unlike
 * `VerifyUploadResponseDto` which extends this with one.
 */
export class VerifyHashResponseDto {
  @ApiProperty({ enum: VERDICT_VALUES })
  verdict!: VerificationAttemptVerdict;

  @ApiProperty({
    description:
      "True when the record matches what was certified (VALID or PENDING_ANCHOR) — false for " +
      "ASSET_MISMATCH/INVALID_RECORD. Independent of on-chain confirmation status.",
  })
  documentIntegrity!: boolean;

  @ApiProperty({ nullable: true, type: ChainAnchorResponseDto })
  chainAnchor!: ChainAnchorResponseDto | null;

  @ApiProperty()
  explanation!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  verifiedAt!: string;
}
