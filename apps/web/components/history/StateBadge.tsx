import { cn } from "@/lib/utils";
import { historyDictionary } from "../../dictionaries/es/history";
import type { TrustRecordState } from "../../lib/api/types";
import { Badge } from "../ui/badge";

/**
 * Semantic colour per DTR lifecycle state, shared by the history list
 * (DtrTable) and the detail view (DtrDetailCard) so a state always reads
 * the same everywhere. Colours convey progress at a glance: certified =
 * success, anchoring = in-progress, failed = destructive. The label text
 * itself still comes from `historyDictionary.states` (RNF-041) and is what
 * tests assert — only the styling is added here.
 */
const stateStyles: Record<TrustRecordState, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  READY: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  ANCHORING:
    "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  CERTIFIED:
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  FAILED: "bg-destructive/10 text-destructive",
  DISCARDED: "bg-muted text-muted-foreground line-through",
};

export function StateBadge({ state }: { state: TrustRecordState }) {
  return (
    <Badge className={cn(stateStyles[state])}>
      {historyDictionary.states[state]}
    </Badge>
  );
}
