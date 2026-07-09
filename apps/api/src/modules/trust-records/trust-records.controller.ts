import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { ConfirmReviewUseCase } from "../../application/certification/confirm-review.use-case";
import { DiscardDraftUseCase } from "../../application/certification/discard-draft.use-case";
import { ANALYZE_DOCUMENT_QUEUE } from "../../application/certification/jobs/queue-names";
import { SubmitForAnchoringUseCase } from "../../application/certification/submit-for-anchoring.use-case";
import {
  ANCHOR_REPOSITORY_PORT,
  type AnchorRepositoryPort,
} from "../../ports/anchor-repository.port";
import { QUEUE_PORT, type QueuePort } from "../../ports/queue.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnchorTrustRecordResponseDto } from "./dto/anchor-trust-record-response.dto";
import { ConfirmTrustRecordResponseDto } from "./dto/confirm-trust-record-response.dto";
import { ReviewTrustRecordDto } from "./dto/review-trust-record.dto";
import { TrustRecordDetailResponseDto } from "./dto/trust-record-detail-response.dto";
import { TrustRecordListResponseDto } from "./dto/trust-record-list-response.dto";

/** No spec-stated limit exists — a design guess (Task Decision, sdd/web-frontend/tasks) capping list responses to a sane page size. */
const MAX_PAGE_SIZE = 100;

/** pg-boss job states that represent a visible, not-yet-succeeded analyze-document outcome. */
const JOB_FAILURE_STATES = new Set(["failed", "retry"]);

@ApiTags("trust-records")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("trust-records")
export class TrustRecordsController {
  constructor(
    private readonly confirmReviewUseCase: ConfirmReviewUseCase,
    private readonly discardDraftUseCase: DiscardDraftUseCase,
    private readonly submitForAnchoringUseCase: SubmitForAnchoringUseCase,
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(ANCHOR_REPOSITORY_PORT)
    private readonly anchorRepository: AnchorRepositoryPort,
    @Inject(QUEUE_PORT)
    private readonly queue: QueuePort,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List trust records for the caller's organization (paginated)",
    description:
      "web-history (Phase 2 companion slice): RNF-004 org-scoping at the query level (never " +
      "post-filtered). An org with zero records returns { items: [], total: 0 }, never a 404. " +
      "`pageSize` is capped at 100 regardless of the requested value.",
  })
  async list(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Request() req: { user: JwtPayload },
  ): Promise<TrustRecordListResponseDto> {
    // Lower-bound clamp so a hostile/typo'd `page<=0` never produces a
    // negative Prisma `skip` (a DB error surfaced as 500) and `pageSize<=0`
    // never yields a zero/negative `take`. Upper bound caps the page size.
    const clampedPage = Math.max(1, page);
    const clampedPageSize = Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));

    const { items, total } = await this.trustRecordRepository.findAllForOrganization(
      req.user.organizationId,
      clampedPage,
      clampedPageSize,
    );

    return { items, total, page: clampedPage, pageSize: clampedPageSize };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a trust record's full detail (org-scoped)",
    description:
      "dtr-lifecycle spec 'Org Scoping on All Certification Endpoints' — 404, not 403, for a " +
      "cross-org id (RNF-004). Joins the latest analyze-document pg-boss job so an analysis " +
      "failure (e.g. no extractable text layer) is visible instead of a silent DRAFT stall " +
      "(design.md 'Analysis-failure visibility').",
  })
  async getById(
    @Param("id") id: string,
    @Request() req: { user: JwtPayload },
  ): Promise<TrustRecordDetailResponseDto> {
    const record = await this.trustRecordRepository.findByIdForOrganization(
      req.user.organizationId,
      id,
    );
    if (!record) {
      throw new NotFoundException("Trust record not found");
    }

    const anchor = record.anchorId ? await this.anchorRepository.findById(record.anchorId) : null;

    let analysisFailureReason: string | null = null;
    if (!record.aiSummary) {
      const latestJob = await this.queue.findLatestJobByTrustRecordId(
        ANALYZE_DOCUMENT_QUEUE,
        record.id,
      );
      if (latestJob && JOB_FAILURE_STATES.has(latestJob.state)) {
        const output = latestJob.output as { message?: string } | null;
        analysisFailureReason = output?.message ?? "Document analysis failed";
      }
    }

    return {
      id: record.id,
      assetId: record.assetId,
      state: record.state,
      canonicalHash: record.canonicalHash,
      versionNumber: record.versionNumber,
      aiSummary: record.aiSummary,
      aiClassification: record.aiClassification,
      aiLanguage: record.aiLanguage,
      aiProvider: record.aiProvider,
      aiModel: record.aiModel,
      aiModelVersion: record.aiModelVersion,
      reviewedByUserId: record.reviewedByUserId,
      anchor: anchor
        ? { txHash: anchor.txHash, blockTimestamp: anchor.blockTimestamp, status: anchor.status }
        : null,
      analysisFailureReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  @Patch(":id/review")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Edit AI-generated fields while the record is still in DRAFT",
    description:
      "Partial patch — only the fields present in the body are updated (dtr-document-analysis " +
      "spec: 'Reviewer edits summary in DRAFT'). Rejected with 409 once the record has left " +
      "DRAFT (INV-21).",
  })
  async review(
    @Param("id") id: string,
    @Body() dto: ReviewTrustRecordDto,
    @Request() req: { user: JwtPayload },
  ): Promise<void> {
    await this.confirmReviewUseCase.reviewEdit({
      organizationId: req.user.organizationId,
      trustRecordId: id,
      reviewedByUserId: req.user.sub,
      ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
      ...(dto.classification !== undefined ? { classification: dto.classification } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
    });
  }

  @Post(":id/confirm")
  @ApiOperation({
    summary: "Confirm review: assemble + hash the canonical DTR, DRAFT -> READY",
    description:
      "Computes canonicalHash via dtr-core (RFC 8785 canonicalization + SHA-256), set exactly " +
      "once and never recomputed (INV-22/24). Rejected with 409 if the record isn't in DRAFT, " +
      "is already confirmed, or analysis/provenance is incomplete (RF-025/INV-26).",
  })
  async confirm(
    @Param("id") id: string,
    @Request() req: { user: JwtPayload },
  ): Promise<ConfirmTrustRecordResponseDto> {
    const result = await this.confirmReviewUseCase.confirm({
      organizationId: req.user.organizationId,
      trustRecordId: id,
    });

    return { ...result, state: "READY" };
  }

  @Post(":id/discard")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Discard a DRAFT record (DRAFT -> DISCARDED)",
    description:
      "Excluded from quota accounting (INV-50 — no quota implementation exists yet, so this is " +
      "purely the state transition). Rejected with 409 from any non-DRAFT state.",
  })
  async discard(@Param("id") id: string, @Request() req: { user: JwtPayload }): Promise<void> {
    await this.discardDraftUseCase.execute({
      organizationId: req.user.organizationId,
      trustRecordId: id,
    });
  }

  @Post(":id/anchor")
  @ApiOperation({
    summary: "Submit for anchoring: READY -> ANCHORING (non-blocking)",
    description:
      "Enqueues the anchor-dtr job and responds immediately with state ANCHORING — the on-chain " +
      "transaction submission happens asynchronously in the background worker (blockchain-anchoring " +
      "spec: 'Submission is non-blocking'; RF-032, RNF-022). Rejected with 409 if the record isn't " +
      "READY or canonicalHash is missing.",
  })
  async anchor(
    @Param("id") id: string,
    @Request() req: { user: JwtPayload },
  ): Promise<AnchorTrustRecordResponseDto> {
    return this.submitForAnchoringUseCase.execute({
      organizationId: req.user.organizationId,
      trustRecordId: id,
    });
  }
}
