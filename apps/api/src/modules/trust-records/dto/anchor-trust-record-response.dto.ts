import { ApiProperty } from "@nestjs/swagger";

export class AnchorTrustRecordResponseDto {
  @ApiProperty()
  trustRecordId!: string;

  @ApiProperty({ example: "ANCHORING" })
  state!: "ANCHORING";
}
