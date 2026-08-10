import { ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { glossaryDictionary } from "../../dictionaries/es/glossary";
import { historyDictionary } from "../../dictionaries/es/history";
import { shellDictionary } from "../../dictionaries/es/shell";
import { config } from "../../lib/config";
import type { TrustRecordDetail } from "../../lib/api/types";
import { PublicVerifyShare } from "./PublicVerifyShare";
import { StateBadge } from "./StateBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { QuickHelp } from "../ui/quick-help";
import { StatusPanel } from "../ui/status-panel";

interface DtrDetailCardProps {
  record: TrustRecordDetail;
}

/** Uppercase field-label recipe (design.md's canonical "Uppercase label"). */
const labelClassName =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

/**
 * Read-only DTR detail view (spec: web-history — "DTR Detail View").
 * Renders state, `canonicalHash` (once set by confirm), AI
 * summary/classification/language, and anchor tx info when present. The
 * certify wizard's own client-island components own the ACTIVE in-progress
 * steps (upload/review/confirm/anchor) — this card is the historical,
 * non-interactive read view rendered by the detail route.
 */
export function DtrDetailCard({ record }: DtrDetailCardProps) {
  const explorerUrl = record.anchor?.txHash
    ? `${config.chainExplorerBaseUrl}/tx/${record.anchor.txHash}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Back-link to the list (spec: web-visual-coherence — "History
          Navigation Affordances", "Detail view links back to the list").
          Reuses the existing shellDictionary.nav.dtrs label — no new key. */}
      <Link
        href="/dtrs"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {shellDictionary.nav.dtrs}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{historyDictionary.detail.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className={labelClassName}>{historyDictionary.detail.stateLabel}</p>
            {record.state === "CERTIFIED" ? (
              <StatusPanel
                variant="success"
                icon={<ShieldCheck className="size-5" aria-hidden="true" />}
                className="mt-1.5 w-fit"
                action={<StateBadge state={record.state} />}
              />
            ) : (
              <div className="mt-1.5">
                <StateBadge state={record.state} />
              </div>
            )}
          </div>

          <dl className="flex flex-col gap-4 border-t border-border pt-4 text-sm">
            <div>
              <dt className={labelClassName}>
                {historyDictionary.detail.canonicalHashLabel}
              </dt>
              <dd className="mt-1.5">
                {record.canonicalHash ? (
                  <code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
                    {record.canonicalHash}
                  </code>
                ) : (
                  <span className="text-muted-foreground">
                    {historyDictionary.detail.canonicalHashPending}
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className={labelClassName}>
                {historyDictionary.detail.anchorTitle}{" "}
                <QuickHelp
                  title={glossaryDictionary.anclar.title}
                  definition={glossaryDictionary.anclar.definition}
                />
              </dt>
              <dd className="mt-1.5">
                {explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {historyDictionary.detail.anchorExplorerLinkLabel}
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    {historyDictionary.detail.anchorNotAnchored}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4 text-sm">
            {record.aiSummary ? (
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className={labelClassName}>
                    {historyDictionary.detail.aiSummaryLabel}
                  </dt>
                  <dd className="mt-1.5">{record.aiSummary}</dd>
                </div>
                {record.aiClassification ? (
                  <div>
                    <dt className={labelClassName}>
                      {historyDictionary.detail.aiClassificationLabel}
                    </dt>
                    <dd className="mt-1.5">{record.aiClassification}</dd>
                  </div>
                ) : null}
                {record.aiLanguage ? (
                  <div>
                    <dt className={labelClassName}>
                      {historyDictionary.detail.aiLanguageLabel}
                    </dt>
                    <dd className="mt-1.5">{record.aiLanguage}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-muted-foreground">{historyDictionary.detail.aiPending}</p>
            )}
          </div>

          {record.state === "CERTIFIED" ? (
            <PublicVerifyShare
              verifyUrl={`${config.appBaseUrl}/verify/${record.id}`}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
