"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { Wordmark } from "../components/brand/Wordmark";
import { Button } from "../components/ui/button";
import { StatusPanel } from "../components/ui/status-panel";
import { shellDictionary } from "../dictionaries/es/shell";

/**
 * Root App Router error boundary (Next 16.2 `error.js` convention — verified
 * against node_modules/next/dist/docs). Catches uncaught render errors from
 * the route segments below it (e.g. an RSC that re-throws a non-404 backend
 * failure) and shows the app's own copy instead of Next's generic crash page.
 *
 * This Next version exposes `unstable_retry` (added in v16.2.0) as the
 * recommended recovery affordance — it re-fetches and re-renders the boundary's
 * children — so we use it rather than the older `reset`.
 *
 * Restyled (spec: web-visual-coherence — "Global error boundary offers a
 * retry button") onto the shared gradient + `StatusPanel error` (keeps
 * `role="alert"` via the panel itself) + `Button` recovery affordance.
 * `app/layout.tsx` is a bare shell here too, so this stays self-contained.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]"
      />
      <div className="relative flex w-full max-w-md flex-col items-center gap-6 text-center">
        <Wordmark />
        <StatusPanel
          variant="error"
          title={shellDictionary.errors.genericTitle}
          action={
            <Button size="lg" onClick={() => unstable_retry()}>
              {shellDictionary.errors.retry}
            </Button>
          }
        >
          {shellDictionary.errors.generic}
        </StatusPanel>
      </div>
    </main>
  );
}
