import { Check, Clock, ShieldAlert, type LucideIcon } from "lucide-react";
import type { VerifyVerdict } from "../api/types";

/**
 * Shared verdict-severity domain (ADR-014; design.md "Honest Verdict
 * Colors"). Replaces the per-component `isErrorVerdict` binary split
 * previously duplicated in `UploadVerdictPanel`, `VerificationDemo`, and
 * `HashOnlyCard` — all three now import from here instead of each
 * maintaining their own copy of "what does this verdict mean."
 *
 * `PENDING_ANCHOR` is deliberately its own severity, not folded into
 * `success`: it means "nothing is anchored/proven yet," and rendering it
 * identically to `VALID` (as the old binary split did) contradicts the
 * product's honest-verification thesis.
 */
export type VerdictSeverity = "success" | "pending" | "error";

export function classifyVerdict(verdict: VerifyVerdict): VerdictSeverity {
  switch (verdict) {
    case "VALID":
      return "success";
    case "PENDING_ANCHOR":
      return "pending";
    case "ASSET_MISMATCH":
    case "INVALID_RECORD":
      return "error";
  }
}

export interface VerdictSeverityStyle {
  className: string;
  Icon: LucideIcon;
  role: "status" | "alert";
}

/**
 * Severity → presentation table (class, icon, ARIA role). Pure data — no
 * component-specific rendering choices here (e.g. whether a consumer shows
 * the icon at all is up to the consumer).
 */
export const VERDICT_SEVERITY_STYLES: Record<VerdictSeverity, VerdictSeverityStyle> = {
  success: {
    className: "bg-success/10 text-success",
    Icon: Check,
    role: "status",
  },
  pending: {
    className: "bg-warning/10 text-warning",
    Icon: Clock,
    role: "status",
  },
  error: {
    className: "bg-destructive/10 text-destructive",
    Icon: ShieldAlert,
    role: "alert",
  },
};
