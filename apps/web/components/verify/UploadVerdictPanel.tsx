"use client";

import { Check, ExternalLink, ShieldAlert, UploadCloud } from "lucide-react";
import { useState, type ChangeEvent, type DragEvent } from "react";

const KB = 1024;
const MB = KB * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}
import { verifyDictionary } from "../../dictionaries/es/verify";
import { postVerifyUpload } from "../../lib/api/public-verify-client";
import type { VerifyUploadResponse } from "../../lib/api/types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
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
  const [isDragging, setIsDragging] = useState(false);

  /** Shared by file-picker and drag-and-drop paths. */
  function selectFile(selected: File | null) {
    setFile(selected);
    setResult(null);
    setError(null);
    // Drop the previously-submitted file so the old hash recompute panel
    // doesn't linger after the user picks a new file.
    setSubmittedFile(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); // required — browsers reject drops without this
    setIsDragging(true);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    // dragleave fires on child-boundary crossings too — only treat it as a
    // real "left the zone" when the cursor didn't move to a child element.
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
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

  const t = verifyDictionary.upload;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 sm:p-8">
      <h2 className="text-lg font-semibold">{t.panelTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{t.panelDescription}</p>

      {/* Native <label>+<input> (not the shadcn Label) so the whole dashed
          dropzone is the clickable trigger. The input carries an explicit
          `aria-label` equal to `fileLabel`: getByLabelText matches on the
          label's raw textContent (which also includes the visible hint), so the
          aria-label is what keeps the test's exact lookup unambiguous. */}
      <label
        htmlFor="verify-upload-file"
        className={cn(
          "mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-accent/40"
            : "border-border bg-muted/40 hover:border-primary/40 hover:bg-accent/40",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"
        >
          <UploadCloud className="size-6" />
        </span>
        <span className="text-sm font-medium">{t.fileLabel}</span>
        <span className="text-xs text-muted-foreground">{t.dropzoneHint}</span>
      </label>
      <input
        id="verify-upload-file"
        type="file"
        aria-label={t.fileLabel}
        className="sr-only"
        onChange={handleFileChange}
      />

      {file ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{file.name}</span>
          {" · "}
          {t.fileSizeLabel.replace("{size}", formatFileSize(file.size))}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        onClick={handleSubmit}
        disabled={!file || isPending}
        className="mt-5 w-full sm:w-auto"
      >
        {t.submitLabel}
      </Button>

      {submittedFile ? (
        <div className="mt-6 border-t border-border pt-6">
          <ClientHashRecompute file={submittedFile} />
        </div>
      ) : null}
      {result ? <VerdictOutcome result={result} /> : null}
    </section>
  );
}

/** True for the two "something is wrong" verdicts — ASSET_MISMATCH and INVALID_RECORD. */
function isErrorVerdict(verdict: VerifyUploadResponse["verdict"]): boolean {
  return verdict === "ASSET_MISMATCH" || verdict === "INVALID_RECORD";
}

function VerdictOutcome({ result }: { result: VerifyUploadResponse }) {
  const copy = verifyDictionary.verdicts[result.verdict];
  const isError = isErrorVerdict(result.verdict);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div
        role={isError ? "alert" : "status"}
        className={cn(
          "rounded-xl p-4",
          isError ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600",
        )}
      >
        <div className="flex items-center gap-2">
          {isError ? <ShieldAlert className="size-5" /> : <Check className="size-5" />}
          <h3 className="font-semibold">{copy.title}</h3>
        </div>
        <p className="mt-1 text-sm">{copy.message}</p>
      </div>

      {result.analysis ? (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-sm">
          {/* Value kept as the element's only direct text node (label is a
              nested <span>) so getByText("Resumen X") resolves — see test. */}
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
        <a
          href={result.chainAnchor.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {verifyDictionary.landing.anchorExplorerLinkLabel}
          <ExternalLink className="size-4" />
        </a>
      ) : null}
    </div>
  );
}
