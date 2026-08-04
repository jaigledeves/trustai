import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";

/**
 * Branded loading fallback for the DTR detail route (spec:
 * web-visual-coherence — "Route-Level Loading and Not-Found Fallbacks").
 * Renders under `(dashboard)/layout.tsx`, so the header/nav persist — this
 * mimics `DtrDetailCard`'s shape (title bar + a few content lines) instead
 * of a generic spinner.
 */
export default function DtrDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Skeleton className="h-5 w-24" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
