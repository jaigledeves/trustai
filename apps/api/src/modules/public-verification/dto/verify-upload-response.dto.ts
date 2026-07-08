import { ApiProperty } from "@nestjs/swagger";
import { VerifyHashResponseDto } from "./verify-hash-response.dto";

export class VerificationAnalysisDto {
  @ApiProperty()
  summary!: string;

  @ApiProperty()
  classification!: string;

  @ApiProperty()
  language!: string;
}

/**
 * public-verification spec "Full Verification via Document Upload"
 * (RF-041/044): POST's response — everything `VerifyHashResponseDto` has,
 * plus `analysis`, populated only when the upload's hash matched
 * (VALID/PENDING_ANCHOR) — `null` for ASSET_MISMATCH/INVALID_RECORD
 * (upload proves possession, so analysis MAY appear only if the hash
 * matches).
 */
export class VerifyUploadResponseDto extends VerifyHashResponseDto {
  @ApiProperty({ nullable: true, type: VerificationAnalysisDto })
  analysis!: VerificationAnalysisDto | null;
}
