import Link from "next/link";
import { verifyDictionary } from "../../../dictionaries/es/verify";

/**
 * Branded not-found fallback for a dead/unmatched public verify id (spec:
 * web-visual-coherence — Decision 7, "Dead record renders branded
 * not-found with recovery"; web-public-verify — "Helpful Empty/Not-Found
 * States"; triggered by the `notFound()` call in `HashOnlyCard`). Renders
 * under `verify/[id]/layout.tsx`, so the header/nav persist — the content
 * area only needs link-specific copy + a recovery link back to `/`.
 * Uses `verifyDictionary.notFound` (not the generic
 * `shellDictionary.errors.notFound`) so the message is specific to a
 * broken/expired verification link.
 */
export default function VerifyIdNotFound() {
  const t = verifyDictionary.notFound;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted-foreground text-pretty">{t.description}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
      >
        {t.homeLinkLabel}
      </Link>
    </main>
  );
}
