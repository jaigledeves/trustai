import { historyDictionary } from "../../dictionaries/es/history";
import { config } from "../../lib/config";
import type { TrustRecordDetail } from "../../lib/api/types";
import { PublicVerifyShare } from "./PublicVerifyShare";
import { StateBadge } from "./StateBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface DtrDetailCardProps {
  record: TrustRecordDetail;
}

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
    <Card>
      <CardHeader>
        <CardTitle>{historyDictionary.detail.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{historyDictionary.detail.stateLabel}</span>
          <StateBadge state={record.state} />

        </div>

        <div>
          <p className="font-medium">{historyDictionary.detail.canonicalHashLabel}</p>
          {record.canonicalHash ? (
            <code className="mt-1 block rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
              {record.canonicalHash}
            </code>
          ) : (
            <p className="text-muted-foreground">
              {historyDictionary.detail.canonicalHashPending}
            </p>
          )}
        </div>

        {record.aiSummary ? (
          <div className="flex flex-col gap-1">
            <p>
              <span className="font-medium">{historyDictionary.detail.aiSummaryLabel}: </span>
              {record.aiSummary}
            </p>
            {record.aiClassification ? (
              <p>
                <span className="font-medium">
                  {historyDictionary.detail.aiClassificationLabel}:{" "}
                </span>
                {record.aiClassification}
              </p>
            ) : null}
            {record.aiLanguage ? (
              <p>
                <span className="font-medium">{historyDictionary.detail.aiLanguageLabel}: </span>
                {record.aiLanguage}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">{historyDictionary.detail.aiPending}</p>
        )}

        <div>
          <p className="font-medium">{historyDictionary.detail.anchorTitle}</p>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {historyDictionary.detail.anchorExplorerLinkLabel}
            </a>
          ) : (
            <p className="text-muted-foreground">
              {historyDictionary.detail.anchorNotAnchored}
            </p>
          )}
        </div>

        {record.state === "CERTIFIED" ? (
          <PublicVerifyShare
            verifyUrl={`${config.appBaseUrl}/verify/${record.id}`}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
