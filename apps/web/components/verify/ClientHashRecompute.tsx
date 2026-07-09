"use client";

import { sha256Hex } from "@trustai/dtr-core";
import { useEffect, useState } from "react";
import { verifyDictionary } from "../../dictionaries/es/verify";

interface ClientHashRecomputeProps {
  file: File;
}

/**
 * Independently computes the uploaded file's SHA-256 in-browser (spec:
 * "Client-Side Independent Hash Recompute") — the tribunal-demo-critical
 * logic in this slice, per design.md. This NEVER trusts the TrustAI
 * backend for the computation: it re-reads the same `File` the user
 * selected and hashes its raw bytes via `@trustai/dtr-core`'s `sha256Hex`
 * (Web Crypto), independently of and in parallel with the server call
 * (`UploadVerdictPanel`).
 *
 * Copy caveat (docs/11 criterion 5, spec "No expectation of full chain
 * re-derivation in-UI"): the public DTOs never return `canonicalHash` or
 * the certified asset hash, so this MUST NOT claim to re-derive/verify the
 * on-chain hash — it demonstrates independent file-hash computation only.
 */
export function ClientHashRecompute({ file }: ClientHashRecomputeProps) {
  const [hash, setHash] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function compute() {
      // Reset any previous file's result the moment `file` changes, so we
      // never briefly render the OLD file's hash (or a stale error) while
      // the new one is still being computed. Done synchronously at the very
      // start of `compute()` (invoked synchronously below), before any await.
      setHash(null);
      setFailed(false);
      try {
        const buffer = await file.arrayBuffer();
        const computed = await sha256Hex(new Uint8Array(buffer));
        if (!cancelled) {
          setHash(computed);
        }
      } catch {
        // Trust-critical: a swallowed rejection here (e.g. crypto.subtle
        // unavailable on a non-secure context) would leave the panel blank
        // forever. Surface an explicit error state instead.
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void compute();

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div role="status" className="flex flex-col gap-1">
      <p className="font-medium">{verifyDictionary.recompute.title}</p>
      {failed ? (
        <p role="alert">{verifyDictionary.recompute.error}</p>
      ) : hash ? (
        <div>
          <p className="text-sm">{verifyDictionary.recompute.hashLabel}</p>
          <code className="break-all">{hash}</code>
        </div>
      ) : null}
      <p className="text-muted-foreground text-sm">{verifyDictionary.recompute.caveat}</p>
    </div>
  );
}
