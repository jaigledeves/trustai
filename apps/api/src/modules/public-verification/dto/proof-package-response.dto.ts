import { ApiProperty } from "@nestjs/swagger";

/** Swagger shape of the `ancrux-proof-1` package; dtr-core's `ProofPackageV1Schema` is the source of truth (ADR-016). */
export class ProofPackageDtrDto {
  @ApiProperty({ enum: ["dtr-2"] })
  schemaVersion!: "dtr-2";

  @ApiProperty({ description: "ISO 8601 UTC instant the record was issued at." })
  issuedAt!: string;

  @ApiProperty({ description: "sha256(JCS(core)), recomputable from the file alone." })
  coreHash!: string;

  @ApiProperty({ description: "sha256(JCS(enrichment)): commits to the AI analysis without revealing it." })
  enrichmentHash!: string;

  @ApiProperty({ description: "sha256(JCS({schemaVersion, issuedAt, coreHash, enrichmentHash})), the anchored value." })
  anchorHash!: string;
}

export class ProofPackageAlgorithmsDto {
  @ApiProperty({ enum: ["SHA-256"] })
  hash!: "SHA-256";

  @ApiProperty({ enum: ["RFC 8785 (JCS)"] })
  canonicalization!: "RFC 8785 (JCS)";
}

export class ProofPackageAnchorDto {
  @ApiProperty({ description: "EIP-155 chain id." })
  chainId!: number;

  @ApiProperty({ example: "base-sepolia" })
  network!: string;

  @ApiProperty({ description: "AnchorRegistry contract address to call isAnchored(anchorHash) on." })
  contractAddress!: string;

  @ApiProperty({ nullable: true, type: String, description: "Null when the hash was already anchored before submission." })
  txHash!: string | null;

  @ApiProperty({ nullable: true, type: String, description: "Decimal string (uint256 block number)." })
  blockNumber!: string | null;

  @ApiProperty({ nullable: true, type: String, description: "ISO 8601 UTC instant of the anchoring block." })
  blockTimestamp!: string | null;
}

export class ProofPackageResponseDto {
  @ApiProperty({ enum: ["ancrux-proof-1"] })
  format!: "ancrux-proof-1";

  @ApiProperty()
  trustRecordId!: string;

  @ApiProperty({ type: ProofPackageDtrDto })
  dtr!: ProofPackageDtrDto;

  @ApiProperty({ type: ProofPackageAlgorithmsDto })
  algorithms!: ProofPackageAlgorithmsDto;

  @ApiProperty({ type: ProofPackageAnchorDto })
  anchor!: ProofPackageAnchorDto;
}
