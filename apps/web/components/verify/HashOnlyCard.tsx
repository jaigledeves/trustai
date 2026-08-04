import { Check, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { getVerifyHash, NotFoundError } from "../../lib/api/public-verify-client";
import type { VerifyHashResponse, VerifyVerdict } from "../../lib/api/types";
import { truncateId } from "../../lib/format";
import { cn } from "../../lib/utils";

interface HashOnlyCardProps {
  id: string;
}

/** True for the two "something is wrong" verdicts — mirrors `UploadVerdictPanel`. */
function isErrorVerdict(verdict: VerifyVerdict): boolean {
  return verdict === "ASSET_MISMATCH" || verdict === "INVALID_RECORD";
}

/**
 * Hash-only landing card (spec: "Hash-Only Card Without Analysis", INV-41).
 * Server Component — `GET /public/verify/:id` is fetched directly (no
 * auth, design.md), and ONLY verdict/documentIntegrity/chainAnchor/
 * explanation/disclaimer/verifiedAt are rendered. `VerifyHashResponse`
 * structurally has no AI analysis field, so INV-41 is enforced at the type
 * level, not just by omission here.
 */
export async function HashOnlyCard({ id }: HashOnlyCardProps) {
  const result = await fetchHash(id);
  const t = verifyDictionary.landing;
  const verdictCopy = verifyDictionary.verdicts[result.verdict];
  const isError = isErrorVerdict(result.verdict);
  const anchored = Boolean(result.chainAnchor?.anchored);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.recordLabel}
        </span>
        {anchored ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            <Check className="size-3.5" />
            {t.anchoredBadge}
          </span>
        ) : null}
      </div>

      <h2
        className={cn(
          "mt-5 text-2xl font-semibold",
          isError ? "text-destructive" : "text-emerald-600",
        )}
      >
        {verdictCopy.title}
      </h2>
      <p className="mt-1 text-pretty">{verdictCopy.message}</p>

      <div
        className={cn(
          "mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
          result.documentIntegrity
            ? "bg-emerald-50 text-emerald-600"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {result.documentIntegrity ? (
          <ShieldCheck className="size-4" />
        ) : (
          <ShieldAlert className="size-4" />
        )}
        {result.documentIntegrity ? t.integrityValidLabel : t.integrityInvalidLabel}
      </div>

      <dl className="mt-6 space-y-4 border-t border-border pt-6 text-sm">
        <div>
          <dt className="font-medium">{t.explanationLabel}</dt>
          <dd className="mt-1 text-muted-foreground text-pretty">{result.explanation}</dd>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t.txHashLabel}</dt>
          <dd className="flex items-center gap-3">
            {/* Kept OUTSIDE the link so the link's accessible name stays exactly
                `anchorExplorerLinkLabel` (asserted by HashOnlyCard.test.tsx). */}
            {result.chainAnchor?.txHash ? (
              <span className="font-mono text-xs text-card-foreground">
                {truncateId(result.chainAnchor.txHash)}
              </span>
            ) : null}
            {result.chainAnchor?.explorerUrl ? (
              <a
                href={result.chainAnchor.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
              >
                {t.anchorExplorerLinkLabel}
                <ExternalLink className="size-4" />
              </a>
            ) : (
              <span className="text-muted-foreground">{t.anchorNotAnchoredLabel}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t.disclaimerLabel}</p>
        <p className="mt-1 text-pretty">{result.disclaimer}</p>
        <p className="mt-3">
          {t.verifiedAtLabel} {formatVerifiedAt(result.verifiedAt)}
        </p>
      </div>
    </section>
  );
}

async function fetchHash(id: string): Promise<VerifyHashResponse> {
  try {
    return await getVerifyHash(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}

function formatVerifiedAt(iso: string): string {
  return new Date(iso).toLocaleString("es-AR");
}
