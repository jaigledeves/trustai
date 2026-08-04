import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";
import { TrustRecordState } from "../../../domain/trust-record.entity";
import { ListTrustRecordsQueryDto } from "./list-trust-records-query.dto";

/** Mirrors the global ValidationPipe config (main.ts): transform + whitelist. */
function parse(raw: Record<string, unknown>) {
  const dto = plainToInstance(ListTrustRecordsQueryDto, raw);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, errors };
}

describe("ListTrustRecordsQueryDto (ADR-008: validated list query)", () => {
  it("applies defaults (page 1, pageSize 20) when the query is empty", () => {
    const { dto, errors } = parse({});
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
    expect(dto.search).toBeUndefined();
    expect(dto.state).toBeUndefined();
  });

  it("coerces the raw string query params into numbers via @Transform", () => {
    const { dto, errors } = parse({ page: "3", pageSize: "50" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
  });

  it("clamps a pageSize above the 100 cap down to 100 (backward-compatible, not a 400)", () => {
    const { dto, errors } = parse({ pageSize: "500" });
    expect(errors).toHaveLength(0);
    expect(dto.pageSize).toBe(100);
  });

  it("clamps a page below 1 up to 1 (backward-compatible, not a 400)", () => {
    const { dto, errors } = parse({ page: "0" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
  });

  it("falls back to defaults for non-numeric garbage instead of NaN", () => {
    const { dto, errors } = parse({ page: "abc", pageSize: "xyz" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it("rejects a bogus state so the endpoint answers 400, never 500 (@IsEnum)", () => {
    const { errors } = parse({ state: "BOGUS" });
    expect(errors.some((e) => e.property === "state")).toBe(true);
  });

  it("accepts a valid state and a search term", () => {
    const { dto, errors } = parse({ state: "CERTIFIED", search: "contrato" });
    expect(errors).toHaveLength(0);
    expect(dto.state).toBe(TrustRecordState.CERTIFIED);
    expect(dto.search).toBe("contrato");
  });

  it("rejects a search longer than 200 chars (@MaxLength)", () => {
    const { errors } = parse({ search: "x".repeat(201) });
    expect(errors.some((e) => e.property === "search")).toBe(true);
  });
});
