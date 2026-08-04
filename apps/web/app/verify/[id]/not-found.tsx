import Link from "next/link";
import { shellDictionary } from "../../../dictionaries/es/shell";

/**
 * Branded not-found fallback for a dead/unmatched public verify id (spec:
 * web-visual-coherence — Decision 7, "Dead record renders branded
 * not-found with recovery"; triggered by the `notFound()` call in
 * `HashOnlyCard`). Renders under `verify/[id]/layout.tsx`, so the
 * header/nav persist — the content area only needs the recovery message
 * + a link back to `/`. Reuses existing `shellDictionary` copy — no new
 * key.
 */
export default function VerifyIdNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {shellDictionary.errors.notFound}
      </h1>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
      >
        {shellDictionary.appName}
      </Link>
    </main>
  );
}
