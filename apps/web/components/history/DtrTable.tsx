import { FileText } from "lucide-react";
import Link from "next/link";
import { historyDictionary } from "../../dictionaries/es/history";
import { truncateId } from "../../lib/format";
import type { TrustRecordListItem } from "../../lib/api/types";
import { Button } from "../ui/button";
import { StatusPanel } from "../ui/status-panel";
import { StateBadge } from "./StateBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface DtrTableProps {
  items: TrustRecordListItem[];
  total: number;
}

/**
 * Org-scoped DTR list table (spec: web-history — "Org-Scoped DTR List").
 * Renders document/classification/state/creation date per row. The
 * document cell links to the detail using the human-meaningful filename;
 * a truncated id is only a fallback for legacy rows with no filename
 * (spec: web-visual-coherence — "Truncated Yet Accessible Record IDs").
 * `total === 0` renders an empty state with a CTA into `/dtrs/new`
 * instead of a blank table (spec: web-visual-coherence — "History
 * Navigation Affordances").
 */
export function DtrTable({ items, total }: DtrTableProps) {
  if (total === 0) {
    return (
      <StatusPanel
        variant="info"
        className="flex flex-col items-center gap-3 py-10 text-center"
        icon={<FileText className="size-8 text-muted-foreground" aria-hidden="true" />}
        title={historyDictionary.list.emptyState}
        action={
          <Button asChild size="sm">
            <Link href="/dtrs/new">{historyDictionary.list.emptyStateCta}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{historyDictionary.list.columnDocument}</TableHead>
          <TableHead>{historyDictionary.list.columnClassification}</TableHead>
          <TableHead>{historyDictionary.list.columnState}</TableHead>
          <TableHead>{historyDictionary.list.columnCreatedAt}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Link
                href={`/dtrs/${item.id}`}
                className={
                  item.filename
                    ? "text-sm font-medium text-primary underline-offset-4 hover:underline"
                    : "font-mono text-sm font-medium text-primary underline-offset-4 hover:underline"
                }
                aria-label={item.filename ?? item.id}
              >
                {item.filename ?? truncateId(item.id)}
              </Link>
            </TableCell>
            <TableCell>
              {item.aiClassification ?? (
                <span className="text-muted-foreground">
                  {historyDictionary.list.classificationPending}
                </span>
              )}
            </TableCell>
            <TableCell>
              <StateBadge state={item.state} />
            </TableCell>
            <TableCell>{formatCreatedAt(item.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
