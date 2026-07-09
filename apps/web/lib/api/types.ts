/**
 * DTOs mirrored 1:1 from `apps/api`'s response shapes. This file grows
 * per-slice (design.md) — Phase 1 only needs auth.
 */

/** Mirrors `LoginResult` (apps/api/src/application/auth/login.use-case.ts). */
export interface LoginResponse {
  accessToken: string;
}

/** Mirrors `RegisterResult` (apps/api/src/application/auth/register.use-case.ts). No token — no auto-login. */
export interface RegisterResponse {
  userId: string;
  organizationId: string;
}

export type TrustRecordState = "DRAFT" | "READY" | "ANCHORING" | "CERTIFIED" | "FAILED" | "DISCARDED";

/** Mirrors `UploadAssetResponseDto` (apps/api/src/modules/assets/dto/upload-asset-response.dto.ts). */
export interface UploadAssetResponse {
  assetId: string;
  trustRecordId: string;
  /** true when an asset with this SHA-256 already existed in this org (RF-012). */
  duplicate: boolean;
}

/** Mirrors `TrustRecordAnchorDetailDto` (apps/api/src/modules/trust-records/dto/trust-record-detail-response.dto.ts). */
export interface TrustRecordAnchorDetail {
  txHash: string | null;
  blockTimestamp: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED";
}

/** Mirrors `TrustRecordDetailResponseDto`. */
export interface TrustRecordDetail {
  id: string;
  assetId: string;
  state: TrustRecordState;
  canonicalHash: string | null;
  versionNumber: number;
  aiSummary: string | null;
  aiClassification: string | null;
  aiLanguage: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  aiModelVersion: string | null;
  reviewedByUserId: string | null;
  anchor: TrustRecordAnchorDetail | null;
  analysisFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `ReviewTrustRecordDto` (apps/api/src/modules/trust-records/dto/review-trust-record.dto.ts) — partial patch, only changed fields are sent. */
export interface ReviewEditPatch {
  summary?: string;
  classification?: string;
  language?: string;
}

/** Mirrors `ConfirmTrustRecordResponseDto`. */
export interface ConfirmTrustRecordResponse {
  trustRecordId: string;
  state: "READY";
  canonicalHash: string;
  issuedAt: string;
}

/** Mirrors `AnchorTrustRecordResponseDto`. */
export interface AnchorTrustRecordResponse {
  trustRecordId: string;
  state: "ANCHORING";
}

/** Mirrors `TrustRecordListItemDto` (apps/api/src/modules/trust-records/dto/trust-record-list-response.dto.ts) — list-view fields only, no AI/anchor joins. */
export interface TrustRecordListItem {
  id: string;
  state: TrustRecordState;
  filename: string | null;
  createdAt: string;
}

/** Mirrors `TrustRecordListResponseDto`. */
export interface TrustRecordListResponse {
  items: TrustRecordListItem[];
  total: number;
  page: number;
  pageSize: number;
}
