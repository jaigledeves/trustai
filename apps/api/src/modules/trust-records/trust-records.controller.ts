import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { ConfirmReviewUseCase } from "../../application/certification/confirm-review.use-case";
import { DiscardDraftUseCase } from "../../application/certification/discard-draft.use-case";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ConfirmTrustRecordResponseDto } from "./dto/confirm-trust-record-response.dto";
import { ReviewTrustRecordDto } from "./dto/review-trust-record.dto";

@ApiTags("trust-records")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("trust-records")
export class TrustRecordsController {
  constructor(
    private readonly confirmReviewUseCase: ConfirmReviewUseCase,
    private readonly discardDraftUseCase: DiscardDraftUseCase,
  ) {}

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
}
