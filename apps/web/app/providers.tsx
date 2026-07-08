"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Wraps the app in a single, stable TanStack Query client.
 *
 * `useState`'s lazy initializer guarantees the client is created exactly
 * once per browser session (not on every re-render) — this is the pattern
 * TanStack Query's own docs recommend for the App Router, where the
 * provider tree is a client component but the client instance itself must
 * survive re-renders untouched.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Certify-wizard polling (Phase 3) overrides this per-query via
            // `refetchInterval`; this default just avoids surprise refetches
            // for the rest of the app's reads.
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
