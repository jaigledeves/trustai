import { ApiProperty } from "@nestjs/swagger";
import { TrustRecordState } from "../../../domain/trust-record.entity";

/** web-history (Phase 2 companion slice): list-view fields only — no AI/anchor joins. */
export class TrustRecordListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TrustRecordState })
  state!: TrustRecordState;

  @ApiProperty({ nullable: true, type: String })
  filename!: string | null;

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
