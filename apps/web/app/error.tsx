"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
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
    <main
      role="alert"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-4 px-4 py-10 text-center"
    >
      <h1 className="text-xl font-semibold">{shellDictionary.errors.genericTitle}</h1>
      <p>{shellDictionary.errors.generic}</p>
      <button type="button" onClick={() => unstable_retry()}>
        {shellDictionary.errors.retry}
      </button>
    </main>
  );
}
