import { ApiPropertyOptional } from "@nestjs/swagger";
import { DOCUMENT_TAXONOMY_V1, type DocumentClass } from "@trustai/dtr-core";
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ReviewTrustRecordDto {
  @ApiPropertyOptional({ description: "Edited AI summary (1-1200 chars)" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  summary?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_TAXONOMY_V1, description: "Edited document classification" })
  @IsOptional()
  @IsIn(DOCUMENT_TAXONOMY_V1)
  classification?: DocumentClass;

  @ApiPropertyOptional({ description: "Edited ISO 639-1 language code (e.g. 'es')" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/, { message: "language must be a lowercase ISO 639-1 two-letter code" })
  language?: string;
}
