import Link from "next/link";
import { Wordmark } from "../components/brand/Wordmark";
import { shellDictionary } from "../dictionaries/es/shell";

/**
 * Root not-found fallback (spec: web-visual-coherence — "Route-Level
 * Loading and Not-Found Fallbacks", "Dead record renders branded
 * not-found with recovery"). `app/layout.tsx` is a bare shell with no
 * persistent nav, so this is fully self-contained: gradient overlay +
 * `Wordmark` (also the recovery link back to `/`) + heading. Reuses
 * existing `shellDictionary` copy — no new key.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]"
      />
      <div className="relative flex flex-col items-center gap-4">
        <Link href="/" aria-label={shellDictionary.appName}>
          <Wordmark />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {shellDictionary.errors.notFound}
        </h1>
      </div>
    </main>
  );
}
