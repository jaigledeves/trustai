"use client";

import { useState, type ChangeEvent } from "react";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { postVerifyUpload } from "../../lib/api/public-verify-client";
import type { VerifyUploadResponse } from "../../lib/api/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ClientHashRecompute } from "./ClientHashRecompute";

interface UploadVerdictPanelProps {
  id: string;
}

/**
 * Upload verdict panel (spec: "Upload Verdict, All Four States" —
 * VALID/ASSET_MISMATCH/PENDING_ANCHOR/INVALID_RECORD, the 4-way branch
 * flagged as this task's highest-risk logic). Posts the upload via
 * `postVerifyUpload` (never expects a 404 — INVALID_RECORD is a normal 200
 * body for an unknown id, design.md "GET vs POST asymmetry") and mounts
 * `ClientHashRecompute` in parallel at submit time, so the independent
 * client-side hash and the server verdict resolve side by side.
 */
export function UploadVerdictPanel({ id }: UploadVerdictPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submittedFile, setSubmittedFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyUploadResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!file) {
      return;
    }
    setIsPending(true);
    setError(null);
    setResult(null);
    setSubmittedFile(file);
    try {
      const response = await postVerifyUpload(id, file);
      setResult(response);
    } catch {
      setError(verifyDictionary.upload.errorGeneric);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="verify-upload-file">{verifyDictionary.upload.fileLabel}</Label>
      <input id="verify-upload-file" type="file" onChange={handleFileChange} />
      {error ? <p role="alert">{error}</p> : null}
      <Button type="button" onClick={handleSubmit} disabled={!file || isPending}>
        {verifyDictionary.upload.submitLabel}
      </Button>

      {submittedFile ? <ClientHashRecompute file={submittedFile} /> : null}
      {result ? <VerdictOutcome result={result} /> : null}
    </div>
  );
}

/** True for the two "something is wrong" verdicts — ASSET_MISMATCH and INVALID_RECORD. */
function isErrorVerdict(verdict: VerifyUploadResponse["verdict"]): boolean {
  return verdict === "ASSET_MISMATCH" || verdict === "INVALID_RECORD";
}

function VerdictOutcome({ result }: { result: VerifyUploadResponse }) {
  const copy = verifyDictionary.verdicts[result.verdict];

  return (
    <div role={isErrorVerdict(result.verdict) ? "alert" : "status"} className="flex flex-col gap-2">
      <h3 className="font-semibold">{copy.title}</h3>
      <p>{copy.message}</p>

      {result.analysis ? (
        <div className="flex flex-col gap-1">
          <p>
            <span className="font-medium">{verifyDictionary.analysis.summaryLabel}: </span>
            {result.analysis.summary}
          </p>
          <p>
            <span className="font-medium">{verifyDictionary.analysis.classificationLabel}: </span>
            {result.analysis.classification}
          </p>
          <p>
            <span className="font-medium">{verifyDictionary.analysis.languageLabel}: </span>
            {result.analysis.language}
          </p>
        </div>
      ) : null}

      {result.chainAnchor?.explorerUrl ? (
        <a href={result.chainAnchor.explorerUrl} target="_blank" rel="noopener noreferrer">
          {verifyDictionary.landing.anchorExplorerLinkLabel}
        </a>
      ) : null}
    </div>
  );
}
