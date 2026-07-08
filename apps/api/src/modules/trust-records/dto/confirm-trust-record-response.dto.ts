import { ApiProperty } from "@nestjs/swagger";

export class ConfirmTrustRecordResponseDto {
  @ApiProperty()
  trustRecordId!: string;

  @ApiProperty({ example: "READY" })
  state!: "READY";

  @ApiProperty({ description: "SHA-256 over the RFC 8785 canonical serialization (INV-22)" })
  canonicalHash!: string;

  @ApiProperty({ description: "ISO 8601 UTC instant" })
  issuedAt!: string;
}
