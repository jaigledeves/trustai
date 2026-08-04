"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { historyDictionary } from "../../dictionaries/es/history";
import { Button } from "../ui/button";

const t = historyDictionary.publicShare;
const COPIED_RESET_DELAY_MS = 2000;

/**
 * Shareable public-verification block for a CERTIFIED DTR: the absolute
 * `/verify/:id` link plus a QR code that encodes it, plus a copy-to-clipboard
 * action (spec: web-visual-coherence — "Copy-to-Clipboard for Public Verify
 * URL"). Anyone can scan/open it and verify the document with no account
 * (spec: web-public-verify "No-Auth Access"). Client component because
 * `qrcode.react`/`useState`/`navigator.clipboard` all need the browser
 * runtime; the absolute URL is passed in as a prop (built from
 * `config.appBaseUrl`) to keep it deterministic and SSR-safe.
 */
export function PublicVerifyShare({ verifyUrl }: { verifyUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_DELAY_MS);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-accent/40 p-4">
      <div>
        <p className="font-medium">{t.title}</p>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-fit rounded-md bg-white p-3 shadow-sm">
          <QRCodeSVG
            value={verifyUrl}
            title={t.qrTitle}
            size={128}
            marginSize={2}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-medium">{t.urlLabel}</span>
          <code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
            {verifyUrl}
          </code>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
            >
              {t.openLinkLabel}
              <ExternalLink className="size-4" />
            </a>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? t.copiedLabel : t.copyLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
