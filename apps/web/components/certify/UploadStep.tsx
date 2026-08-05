"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { useUploadAsset } from "../../lib/api/hooks/useUploadAsset";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { StatusPanel } from "../ui/status-panel";

const PDF_MIME_TYPE = "application/pdf";
// Soft warning only — the backend enforces no hard maximum (design.md
// Grounding Correction #5), so the client must never hard-block on size.
const SIZE_WARNING_THRESHOLD_BYTES = 20 * 1024 * 1024;

const KB = 1024;
const MB = KB * 1024;

/**
 * Local copy, mirroring `DocumentContextHeader.tsx`'s `formatSizeBytes` —
 * not extracted into a shared util per design.md's "Out of Scope" note
 * (keeps this change's diff scoped to this component).
 */
function formatFileSize(bytes: number): string {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Upload step (spec: "PDF Upload", RF-012 duplicate handling). */
export function UploadStep() {
  const router = useRouter();
  const uploadAsset = useUploadAsset();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /** Shared by the file-picker (`onChange`) and drag-and-drop (`onDrop`) paths. */
  function validateAndSetFile(selected: File | null) {
    setValidationError(null);
    setSizeWarning(null);
    setSubmitError(null);
    setFile(null);

    if (!selected) {
      return;
    }
    if (selected.type !== PDF_MIME_TYPE) {
      setValidationError(certifyDictionary.upload.errorNotPdf);
      return;
    }
    if (selected.size > SIZE_WARNING_THRESHOLD_BYTES) {
      setSizeWarning(certifyDictionary.upload.errorSizeWarning);
    }
    setFile(selected);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSetFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    validateAndSetFile(event.dataTransfer.files[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    // preventDefault is required — browsers reject drops on elements that
    // don't cancel dragover.
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    // dragleave fires for every child boundary crossing too — only treat it
    // as a real "left the zone" when the cursor didn't move to a child.
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }

  async function handleSubmit() {
    if (!file) {
      return;
    }
    setSubmitError(null);
    try {
      const result = await uploadAsset.mutateAsync(file);
      router.push(
        result.duplicate
          ? `/dtrs/${result.trustRecordId}?notice=duplicate`
          : `/dtrs/${result.trustRecordId}`,
      );
    } catch {
      setSubmitError(certifyDictionary.upload.errorGeneric);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{certifyDictionary.upload.title}</h1>

      {/* Dropzone recipe (design.md's canonical dropzone, matching
          UploadVerdictPanel). The `aria-label` on the hidden input keeps
          `getByLabelText(dropLabel)` unambiguous regardless of the visible
          hint text inside the label. */}
      <label
        htmlFor="upload-file"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-accent/40"
            : "border-border bg-muted/40 hover:border-primary/40 hover:bg-accent/40",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"
        >
          <UploadCloud className="size-6" />
        </span>
        <span className="text-sm font-medium">{certifyDictionary.upload.dropLabel}</span>
        <span className="text-xs text-muted-foreground">{certifyDictionary.upload.dropHint}</span>
      </label>
      <input
        id="upload-file"
        type="file"
        accept="application/pdf"
        aria-label={certifyDictionary.upload.dropLabel}
        className="sr-only"
        onChange={handleFileChange}
      />

      {file ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{file.name}</span>
          <br />
          {certifyDictionary.upload.fileSizeLabel.replace("{size}", formatFileSize(file.size))}
        </p>
      ) : null}

      {validationError ? <StatusPanel variant="error">{validationError}</StatusPanel> : null}
      {sizeWarning ? <StatusPanel variant="info">{sizeWarning}</StatusPanel> : null}
      {submitError ? <StatusPanel variant="error">{submitError}</StatusPanel> : null}

      <Button
        type="button"
        size="lg"
        onClick={handleSubmit}
        disabled={!file || uploadAsset.isPending}
      >
        {certifyDictionary.upload.submit}
      </Button>
    </div>
  );
}
