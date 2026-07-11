"use client";

import { QRCodeSVG } from "qrcode.react";
import { historyDictionary } from "../../dictionaries/es/history";

const t = historyDictionary.publicShare;

/**
 * Shareable public-verification block for a CERTIFIED DTR: the absolute
 * `/verify/:id` link plus a QR code that encodes it. Anyone can scan/open it
 * and verify the document with no account (spec: web-public-verify "No-Auth
 * Access"). Client component because `qrcode.react` uses React hooks, so it
 * cannot render inside a Server Component; the absolute URL is passed in as a
 * prop (built from `config.appBaseUrl`) to keep it deterministic and SSR-safe.
 */
export function PublicVerifyShare({ verifyUrl }: { verifyUrl: string }) {
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
          <code className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
            {verifyUrl}
          </code>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.openLinkLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
