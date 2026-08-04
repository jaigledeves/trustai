import { ApiProperty } from "@nestjs/swagger";
import { TrustRecordState } from "../../../domain/trust-record.entity";

/**
 * web-history (Phase 2 companion slice): list-view fields only — no anchor
 * joins. `aiClassification` lives on the TrustRecord row itself (no extra
 * join) and gives the list a browsable, human-meaningful column.
 */
export class TrustRecordListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TrustRecordState })
  state!: TrustRecordState;

  @ApiProperty({ nullable: true, type: String })
  filename!: string | null;

  @ApiProperty({ nullable: true, type: String })
  aiClassification!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class TrustRecordListResponseDto {
  @ApiProperty({ type: [TrustRecordListItemDto] })
  items!: TrustRecordListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
