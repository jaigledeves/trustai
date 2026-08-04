import { Skeleton } from "../../../components/ui/skeleton";

/**
 * Branded loading fallback for the public verify route (spec:
 * web-visual-coherence — Decision 7). Renders under
 * `verify/[id]/layout.tsx`, so the header/nav persist for free — this
 * only needs card-shaped skeletons mimicking `HashOnlyCard`/
 * `UploadVerdictPanel` in the content area.
 */
export default function VerifyIdLoading() {
  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
    </main>
  );
}
