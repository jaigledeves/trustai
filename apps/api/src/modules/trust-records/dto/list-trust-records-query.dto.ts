import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TrustRecordState } from "../../../domain/trust-record.entity";

/** Upper bound for `pageSize` — a page response never exceeds this many rows. */
const MAX_PAGE_SIZE = 100;

/**
 * Clamp a raw query value to an integer within [min, max], falling back to
 * `fallback` for absent/garbage input. Deliberately forgiving (clamp, don't
 * reject) so out-of-range paging never turns into a 400 — this preserves the
 * pre-existing contract (S-DTR-11: `pageSize=500` → capped 100, `page=0` → 1)
 * that the bare `ParseIntPipe`/`Math.min` controller code used to provide.
 */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * web-dtr-list / ADR-008: the first validated query DTO in the API — replaces
 * the controller's bare `@Query`+pipe params for `GET /trust-records`. The
 * global `ValidationPipe` (`transform: true`) runs these transforms;
 * `whitelist: true` strips unknown params. Numbers CLAMP (backward-compatible,
 * never a 400), but `state` REJECTS an out-of-enum value with a 400 (never a
 * 500) — the genuine validation win over the old bare pipes.
 */
export class ListTrustRecordsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: "1-based page number (clamped >= 1)" })
  @IsOptional()
  @Transform(({ value }) => clampInt(value, 1, Number.MAX_SAFE_INTEGER, 1))
  page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: 20,
    description: "Page size (clamped to 1..100)",
  })
  @IsOptional()
  @Transform(({ value }) => clampInt(value, 1, MAX_PAGE_SIZE, 20))
  pageSize: number = 20;

  @ApiPropertyOptional({ description: "Case-insensitive filename search (contains)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: TrustRecordState, description: "Exact lifecycle-state filter" })
  @IsOptional()
  @IsEnum(TrustRecordState)
  state?: TrustRecordState;
}
