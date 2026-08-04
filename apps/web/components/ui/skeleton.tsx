import * as React from "react"

import { cn } from "@/lib/utils"

/** Simple loading placeholder primitive, used by per-route `loading.tsx` fallbacks. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
