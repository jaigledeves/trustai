/**
 * Root RSC-suspense fallback (spec: web-visual-coherence — "Route-Level
 * Loading and Not-Found Fallbacks"). `app/layout.tsx` is a bare `<html>/
 * <body>` shell with no persistent nav, so this must be fully
 * self-contained: a centered spinner using the canonical spinner recipe
 * (`AnchorPoller`'s pending-state recipe, now also `StatusPanel`'s).
 */
export default function Loading() {
  return (
    <div role="status" className="flex min-h-screen flex-1 items-center justify-center">
      <span
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
