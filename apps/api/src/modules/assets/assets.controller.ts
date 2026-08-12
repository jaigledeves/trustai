import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { UploadAssetUseCase } from "../../application/certification/upload-asset.use-case";
import {
  DIGITAL_ASSET_REPOSITORY_PORT,
  type DigitalAssetRepositoryPort,
} from "../../ports/digital-asset-repository.port";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AssetResponseDto } from "./dto/asset-response.dto";
import { UploadAssetResponseDto } from "./dto/upload-asset-response.dto";

const PDF_MIME_TYPE = "application/pdf";

const UPLOAD_THROTTLE_TTL_MS = 60_000;
export const DEFAULT_UPLOAD_THROTTLE_LIMIT = 5;

/**
 * ADR-012 / spec "Stricter Throttle on Asset Upload": `POST /assets`
 * enqueues `analyze-document` against the paid OpenAI adapter, so it needs
 * a tighter limit than the global default (`THROTTLE_LIMIT`). Read via
 * `process.env` directly (not `ConfigService`), mirroring
 * `public-verification.controller.ts`'s `resolveGetThrottleLimit`/
 * `resolvePostThrottleLimit` pattern: `@Throttle`'s `limit` accepts a
 * `Resolvable<number>` (a plain number or a function), and decorator
 * arguments are evaluated once at class-definition time, not per-request —
 * a function defers the read to request time instead, making
 * `UPLOAD_THROTTLE_LIMIT` actually configurable without a restart-only env
 * read baked into the decorator.
 */
export function resolveUploadThrottleLimit(): number {
  return Number(process.env["UPLOAD_THROTTLE_LIMIT"] ?? DEFAULT_UPLOAD_THROTTLE_LIMIT);
}

@ApiTags("assets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assets")
export class AssetsController {
  constructor(
    private readonly uploadAssetUseCase: UploadAssetUseCase,
    @Inject(DIGITAL_ASSET_REPOSITORY_PORT)
    private readonly digitalAssetRepository: DigitalAssetRepositoryPort,
  ) {}

  @Post()
  @Throttle({ global: { limit: resolveUploadThrottleLimit, ttl: UPLOAD_THROTTLE_TTL_MS } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload a PDF for certification",
    description:
      "Authenticated, org-scoped upload (asset-ingestion spec). Hashes and encrypts the file, " +
      "creates a DigitalAsset + DRAFT TrustRecord, or returns the existing DTR reference if this " +
      "org already has an asset with the same SHA-256 (RF-012).",
  })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: { user: JwtPayload },
  ): Promise<UploadAssetResponseDto> {
    if (!file) {
      throw new BadRequestException("A file is required");
    }
    if (file.mimetype !== PDF_MIME_TYPE) {
      throw new BadRequestException("Only application/pdf uploads are supported");
    }

    return this.uploadAssetUseCase.execute({
      organizationId: req.user.organizationId,
      createdByUserId: req.user.sub,
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname ?? null,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a digital asset by id (org-scoped)" })
  async getById(
    @Param("id") id: string,
    @Request() req: { user: JwtPayload },
  ): Promise<AssetResponseDto> {
    const asset = await this.digitalAssetRepository.findById(req.user.organizationId, id);
    if (!asset) {
      // RNF-004 / asset-ingestion spec "Cross-org access is rejected": 404,
      // never 403, so a caller can't distinguish "not yours" from "doesn't exist".
      throw new NotFoundException("Asset not found");
    }

    return {
      id: asset.id,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      filename: asset.filename,
      status: asset.status,
      createdAt: asset.createdAt,
    };
  }
}
