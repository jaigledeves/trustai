import { ApiProperty } from "@nestjs/swagger";
import { AnchorStatus } from "../../../domain/anchor.entity";
import { TrustRecordState } from "../../../domain/trust-record.entity";

export class TrustRecordAnchorDetailDto {
  @ApiProperty({ nullable: true, type: String })
  txHash!: string | null;

  @ApiProperty({ nullable: true, type: Date })
  blockTimestamp!: Date | null;

  @ApiProperty({ enum: AnchorStatus })
  status!: AnchorStatus;
}

/**
 * web-certify-flow "Persistent Document Context": named `uploadedAt`
 * (not `createdAt`) to sidestep the collision with this DTO's own
 * `createdAt` — it's the asset's upload time, not the record's
 * (design.md "DTO shape for the new asset fields").
 */
export class TrustRecordAssetDetailDto {
  @ApiProperty({ nullable: true, type: String })
  filename!: string | null;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  uploadedAt!: Date;
}

export class TrustRecordDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty({ enum: TrustRecordState })
  state!: TrustRecordState;

  @ApiProperty({ nullable: true, type: String })
  canonicalHash!: string | null;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ nullable: true, type: String })
  aiSummary!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiClassification!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiLanguage!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiProvider!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiModel!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiModelVersion!: string | null;

  @ApiProperty({ nullable: true, type: String })
  reviewedByUserId!: string | null;

  @ApiProperty({
    nullable: true,
    type: TrustRecordAnchorDetailDto,
    description: "Only present once the record has been submitted for anchoring (state != DRAFT/READY/DISCARDED, anchorId set)",
  })
  anchor!: TrustRecordAnchorDetailDto | null;

  @ApiProperty({
    type: TrustRecordAssetDetailDto,
    description:
      "web-certify-flow 'Persistent Document Context' — always present: every TrustRecord has " +
      "exactly one asset (assetId is already non-null on this DTO).",
  })
  asset!: TrustRecordAssetDetailDto;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      "dtr-lifecycle spec 'Failure state is visible throughout' — the analyze-document job's " +
      "failure message (design.md 'Analysis-failure visibility': read from pg-boss's own job " +
      "history, not a TrustRecord column). Only non-null while the record is still DRAFT with no " +
      "AI fields and the latest analyze-document job failed.",
  })
  analysisFailureReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
