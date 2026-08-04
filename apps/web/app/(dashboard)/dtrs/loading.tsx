import { Card } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";

const SKELETON_ROW_COUNT = 5;

/**
 * Branded loading fallback for the DTR list route (spec:
 * web-visual-coherence — "Route-Level Loading and Not-Found Fallbacks").
 * Renders under `(dashboard)/layout.tsx`, so the header/nav persist — this
 * only needs the content area: a `Card`-wrapped skeleton mimicking the
 * table's header row plus a handful of record rows.
 */
export default function DtrsListLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <Skeleton className="h-8 w-40" />
      <Card className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </Card>
    </main>
  );
}
