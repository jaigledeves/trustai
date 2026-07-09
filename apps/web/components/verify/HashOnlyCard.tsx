import { notFound } from "next/navigation";
import { verifyDictionary } from "../../dictionaries/es/verify";
import { getVerifyHash, NotFoundError } from "../../lib/api/public-verify-client";
import type { VerifyHashResponse } from "../../lib/api/types";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface HashOnlyCardProps {
  id: string;
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
  const verdictCopy = verifyDictionary.verdicts[result.verdict];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{verdictCopy.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p>{verdictCopy.message}</p>

        <Badge>
          {result.documentIntegrity
            ? verifyDictionary.landing.integrityValidLabel
            : verifyDictionary.landing.integrityInvalidLabel}
        </Badge>

        <div>
          <p className="font-medium">{verifyDictionary.landing.explanationLabel}</p>
          <p className="text-muted-foreground">{result.explanation}</p>
        </div>

        {result.chainAnchor?.explorerUrl ? (
          <a href={result.chainAnchor.explorerUrl} target="_blank" rel="noopener noreferrer">
            {verifyDictionary.landing.anchorExplorerLinkLabel}
          </a>
        ) : (
          <p className="text-muted-foreground">{verifyDictionary.landing.anchorNotAnchoredLabel}</p>
        )}

        <div>
          <p className="font-medium">{verifyDictionary.landing.disclaimerLabel}</p>
          <p className="text-muted-foreground text-sm">{result.disclaimer}</p>
        </div>

        <p className="text-muted-foreground text-xs">
          {verifyDictionary.landing.verifiedAtLabel} {formatVerifiedAt(result.verifiedAt)}
        </p>
      </CardContent>
    </Card>
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
