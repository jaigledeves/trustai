import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type {
  VerifyChainAnchor,
  VerifyResult,
  VerifyVerdict,
} from "../../application/verification/verify-document.use-case";
import { VerifyDocumentUseCase } from "../../application/verification/verify-document.use-case";
import type { VerificationAttemptChannel } from "../../ports/verification-attempt-repository.port";
import { ChainAnchorResponseDto, VerifyHashResponseDto } from "./dto/verify-hash-response.dto";
import { VerifyUploadResponseDto } from "./dto/verify-upload-response.dto";

const VALID_CHANNELS: readonly VerificationAttemptChannel[] = ["QR", "URL", "HASH"];
const DEFAULT_CHANNEL: VerificationAttemptChannel = "URL";

const GET_THROTTLE_TTL_MS = 60_000;
const POST_THROTTLE_TTL_MS = 60_000;
const DEFAULT_GET_THROTTLE_LIMIT = 60;
const DEFAULT_POST_THROTTLE_LIMIT = 20;

const DEFAULT_EXPLORER_BASE_URL = "https://sepolia.basescan.org";

/**
 * `@Throttle`'s `limit` accepts a `Resolvable<number>` (a plain number or
 * a function) — read via `process.env` directly (not `ConfigService`)
 * since decorator arguments are evaluated once at class-definition time,
 * not per-request; a function defers the read to request time instead,
 * making the .env values (`PUBLIC_VERIFY_GET_THROTTLE_LIMIT`/
 * `PUBLIC_VERIFY_POST_THROTTLE_LIMIT`) actually configurable. Defaults
 * match the spec's fixed 60/20 (RF-042's rate-limiting requirement).
 */
function resolveGetThrottleLimit(): number {
  return Number(process.env["PUBLIC_VERIFY_GET_THROTTLE_LIMIT"] ?? DEFAULT_GET_THROTTLE_LIMIT);
}

function resolvePostThrottleLimit(): number {
  return Number(process.env["PUBLIC_VERIFY_POST_THROTTLE_LIMIT"] ?? DEFAULT_POST_THROTTLE_LIMIT);
}

/**
 * public-verification (UC-02): no-auth verification surface. Deliberately
 * carries NO `@UseGuards(JwtAuthGuard)` — structurally separate from
 * `TrustRecordsModule`/`AssetsModule` (design.md, RF-040). The only guard
 * is `ThrottlerGuard`, resolved from this module's own `ThrottlerModule`
 * import (never a global `APP_GUARD` — that would throttle every
 * authenticated route in the app too).
 */
@ApiTags("public-verification")
@UseGuards(ThrottlerGuard)
@Controller("public/verify")
export class PublicVerificationController {
  constructor(
    private readonly verifyDocumentUseCase: VerifyDocumentUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Get(":id")
  @Throttle({ default: { limit: resolveGetThrottleLimit, ttl: GET_THROTTLE_TTL_MS } })
  @ApiQuery({ name: "channel", required: false, enum: VALID_CHANNELS })
  @ApiOperation({
    summary: "Hash-only public verification (no auth)",
    description:
      "GET /public/verify/:id — existence, state, and anchor verdict only (RF-042, INV-41): " +
      "never returns AI analysis or content. Unknown id -> 404 (spec: 'Unknown id yields 404').",
  })
  async verifyByHash(
    @Param("id") id: string,
    @Query("channel") channel?: string,
  ): Promise<VerifyHashResponseDto> {
    const result = await this.verifyDocumentUseCase.verifyByHash({
      trustRecordId: id,
      channel: this.resolveChannel(channel),
    });

    // design.md "GET vs POST 404 asymmetry": GET 404s an unresolved id;
    // POST (below) never does — it returns 200 INVALID_RECORD instead.
    if (!result.resolved) {
      throw new NotFoundException("Trust record not found");
    }

    return this.toHashResponse(result);
  }

  @Post(":id")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: resolvePostThrottleLimit, ttl: POST_THROTTLE_TTL_MS } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiQuery({ name: "channel", required: false, enum: VALID_CHANNELS })
  @ApiOperation({
    summary: "Full public verification by document upload (no auth)",
    description:
      "POST /public/verify/:id — hashes the upload, compares to the certified asset, and " +
      "corroborates on-chain (RF-041/044). AI analysis is included only when the hash matches " +
      "(VALID/PENDING_ANCHOR). Unknown id -> 200 INVALID_RECORD (never 404, unlike GET).",
  })
  async verifyByUpload(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query("channel") channel?: string,
  ): Promise<VerifyUploadResponseDto> {
    if (!file) {
      throw new BadRequestException("A file is required");
    }

    const result = await this.verifyDocumentUseCase.verifyByUpload({
      trustRecordId: id,
      fileBytes: file.buffer,
      channel: this.resolveChannel(channel),
    });

    return this.toUploadResponse(result);
  }

  private resolveChannel(channel: string | undefined): VerificationAttemptChannel {
    if (channel === undefined) {
      return DEFAULT_CHANNEL;
    }
    if ((VALID_CHANNELS as readonly string[]).includes(channel)) {
      return channel as VerificationAttemptChannel;
    }
    throw new BadRequestException(
      `Invalid channel "${channel}" — must be one of ${VALID_CHANNELS.join(", ")}`,
    );
  }

  /**
   * True when the record matches what was certified — VALID (fully
   * confirmed on-chain) or PENDING_ANCHOR (hash/content confirmed, chain
   * confirmation still pending). False for ASSET_MISMATCH/INVALID_RECORD.
   * Deliberately independent of on-chain confirmation status — that
   * nuance lives in `chainAnchor.anchored`/`chainReadUnavailable`.
   */
  private buildDocumentIntegrity(verdict: VerifyVerdict): boolean {
    return verdict === "VALID" || verdict === "PENDING_ANCHOR";
  }

  private buildExplorerUrl(txHash: string | null): string | null {
    if (!txHash) {
      return null;
    }
    const base = this.configService.get<string>("CHAIN_EXPLORER_BASE_URL", DEFAULT_EXPLORER_BASE_URL);
    return `${base.replace(/\/$/, "")}/tx/${txHash}`;
  }

  private toChainAnchorDto(chainAnchor: VerifyChainAnchor | null): ChainAnchorResponseDto | null {
    if (!chainAnchor) {
      return null;
    }
    return {
      anchored: chainAnchor.anchored,
      txHash: chainAnchor.txHash,
      blockTimestamp: chainAnchor.blockTimestamp,
      explorerUrl: this.buildExplorerUrl(chainAnchor.txHash),
      chainReadUnavailable: chainAnchor.chainReadUnavailable,
    };
  }

  private toHashResponse(result: VerifyResult): VerifyHashResponseDto {
    return {
      verdict: result.verdict,
      documentIntegrity: this.buildDocumentIntegrity(result.verdict),
      chainAnchor: this.toChainAnchorDto(result.chainAnchor),
      explanation: result.explanation,
      disclaimer: result.disclaimer,
      verifiedAt: result.verifiedAt,
    };
  }

  private toUploadResponse(result: VerifyResult): VerifyUploadResponseDto {
    return {
      ...this.toHashResponse(result),
      analysis: result.analysis,
    };
  }
}
