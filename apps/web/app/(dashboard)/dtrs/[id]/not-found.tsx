import Link from "next/link";
import { shellDictionary } from "../../../../dictionaries/es/shell";

/**
 * Branded not-found fallback for a dead/cross-org DTR id (spec:
 * web-visual-coherence — "Route-Level Loading and Not-Found Fallbacks",
 * "Dead record renders branded not-found with recovery"; triggered by the
 * `notFound()` call in `[id]/page.tsx`, RNF-004). Renders under
 * `(dashboard)/layout.tsx`, so the header/nav persist — only the content
 * area needs the recovery message + link back to `/dtrs`. Reuses existing
 * `shellDictionary` copy (no new dictionary keys).
 */
export default function DtrDetailNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {shellDictionary.errors.notFound}
      </h1>
      <Link
        href="/dtrs"
        className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
      >
        {shellDictionary.nav.dtrs}
      </Link>
    </main>
  );
}
