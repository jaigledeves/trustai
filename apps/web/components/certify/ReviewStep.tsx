"use client";

import { useState } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { ApiError, mapApiError } from "../../lib/api/errors";
import { useReviewEdit } from "../../lib/api/hooks/useReviewEdit";
import type { ReviewEditPatch, TrustRecordDetail } from "../../lib/api/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface ReviewStepProps {
  id: string;
  record: TrustRecordDetail;
}

/**
 * True when analysis finished but FAILED (a failure reason is recorded and
 * no summary was produced). Shared with `CertifyWizard` so the wizard shell
 * can branch off the SAME predicate this step uses for its failure banner —
 * on a failed analysis the shell must NOT render a `ConfirmButton` (confirm
 * would 409 against incomplete analysis), only the banner + discard.
 */
export function hasAnalysisFailed(
  record: Pick<TrustRecordDetail, "aiSummary" | "analysisFailureReason">,
): boolean {
  return !record.aiSummary && !!record.analysisFailureReason;
}

/**
 * Review step (spec: "AI Analysis Display, Including Failure Visibility" +
 * "Review Edit"). Two mutually exclusive render paths: a failure banner
 * (no extractable text layer, etc — never a silent DRAFT stall) OR the
 * editable AI fields. Only fields the reviewer actually changed are sent
 * to the PATCH (partial patch, matching the backend's contract).
 */
export function ReviewStep({ id, record }: ReviewStepProps) {
  const reviewEdit = useReviewEdit(id);
  const [summary, setSummary] = useState(record.aiSummary ?? "");
  const [classification, setClassification] = useState(record.aiClassification ?? "");
  const [language, setLanguage] = useState(record.aiLanguage ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (hasAnalysisFailed(record)) {
    return (
      <div role="alert">
        <h2 className="font-semibold">{certifyDictionary.review.analysisFailedTitle}</h2>
        <p>{record.analysisFailureReason}</p>
      </div>
    );
  }

  async function handleSave() {
    setFormError(null);
    setSaved(false);

    const patch: ReviewEditPatch = {};
    if (summary !== (record.aiSummary ?? "")) patch.summary = summary;
    if (classification !== (record.aiClassification ?? "")) patch.classification = classification;
    if (language !== (record.aiLanguage ?? "")) patch.language = language;

    if (Object.keys(patch).length === 0) {
      return;
    }

    try {
      await reviewEdit.mutateAsync(patch);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(mapApiError(error.status, "review"));
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{certifyDictionary.review.title}</h2>
      <div>
        <Label htmlFor="review-summary">{certifyDictionary.review.summaryLabel}</Label>
        <textarea
          id="review-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="review-classification">
          {certifyDictionary.review.classificationLabel}
        </Label>
        <Input
          id="review-classification"
          value={classification}
          onChange={(event) => setClassification(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="review-language">{certifyDictionary.review.languageLabel}</Label>
        <Input
          id="review-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
      </div>
      {formError ? <p role="alert">{formError}</p> : null}
      {saved ? <p role="status">{certifyDictionary.review.saved}</p> : null}
      <Button type="button" onClick={handleSave} disabled={reviewEdit.isPending}>
        {certifyDictionary.review.save}
      </Button>
    </div>
  );
}
