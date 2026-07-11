import Link from "next/link";
import { historyDictionary } from "../../dictionaries/es/history";
import type { TrustRecordListItem } from "../../lib/api/types";
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
 * Renders id/state/creation date per row; `total === 0` renders the
 * empty-state copy instead of a blank table (spec scenario: "Empty state").
 */
export function DtrTable({ items, total }: DtrTableProps) {
  if (total === 0) {
    return <p role="status">{historyDictionary.list.emptyState}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{historyDictionary.list.columnId}</TableHead>
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
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.id}
              </Link>
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
