"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { certifyDictionary } from "../../dictionaries/es/certify";
import { useUploadAsset } from "../../lib/api/hooks/useUploadAsset";
import { Button } from "../ui/button";

const PDF_MIME_TYPE = "application/pdf";
// Soft warning only — the backend enforces no hard maximum (design.md
// Grounding Correction #5), so the client must never hard-block on size.
const SIZE_WARNING_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** Upload step (spec: "PDF Upload", RF-012 duplicate handling). */
export function UploadStep() {
  const router = useRouter();
  const uploadAsset = useUploadAsset();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
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
      <label htmlFor="upload-file">{certifyDictionary.upload.dropLabel}</label>
      <input
        id="upload-file"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
      />
      {validationError ? <p role="alert">{validationError}</p> : null}
      {sizeWarning ? <p role="status">{sizeWarning}</p> : null}
      {submitError ? <p role="alert">{submitError}</p> : null}
      <Button type="button" onClick={handleSubmit} disabled={!file || uploadAsset.isPending}>
        {certifyDictionary.upload.submit}
      </Button>
    </div>
  );
}
