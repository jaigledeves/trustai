import { ApiProperty } from "@nestjs/swagger";

export class UploadAssetResponseDto {
  @ApiProperty()
  assetId!: string;

  @ApiProperty()
  trustRecordId!: string;

  @ApiProperty({
    description: "true when an asset with this SHA-256 already existed in this org (RF-012)",
  })
  duplicate!: boolean;
}
