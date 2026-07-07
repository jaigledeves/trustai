import { ApiProperty } from "@nestjs/swagger";
import { AssetStatus } from "../../../domain/digital-asset.entity";

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sha256!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ nullable: true, type: String })
  filename!: string | null;

  @ApiProperty({ enum: AssetStatus })
  status!: AssetStatus;

  @ApiProperty()
  createdAt!: Date;
}
