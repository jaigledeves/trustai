import * as React from "react"
import { Check, ShieldAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type StatusPanelVariant = "pending" | "success" | "error" | "info"

interface StatusPanelProps {
  variant: StatusPanelVariant
  title?: string
  children?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

const containerClassName: Record<StatusPanelVariant, string> = {
  pending: "flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4",
  success:
    "flex flex-col items-center gap-3 rounded-xl bg-success/10 p-4 text-center text-success",
  error: "rounded-xl bg-destructive/10 p-4 text-destructive",
  info: "rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground",
}

const roleByVariant: Record<StatusPanelVariant, "status" | "alert"> = {
  pending: "status",
  success: "status",
  error: "alert",
  info: "status",
}

function defaultIcon(variant: StatusPanelVariant): React.ReactNode {
  switch (variant) {
    case "pending":
      return (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
      )
    case "success":
      return <Check className="size-5" aria-hidden="true" />
    case "error":
      return <ShieldAlert className="size-5" aria-hidden="true" />
    case "info":
      return null
  }
}

/**
 * Shared status/error panel (spec: web-visual-coherence — "Shared
 * Status/Error Panel Usage"). Generalizes `AnchorPoller`'s proven
 * `ProgressStatus`/`SlowNotice` pattern into 4 variants so wizard/auth/global
 * status surfaces stop hand-rolling bare `<p role="alert|status">` markup.
 */
function StatusPanel({ variant, title, children, icon, action, className }: StatusPanelProps) {
  const resolvedIcon = icon === undefined ? defaultIcon(variant) : icon

  return (
    <div data-slot="status-panel" role={roleByVariant[variant]} className={cn(containerClassName[variant], className)}>
      {resolvedIcon}
      {title || children || action ? (
        <div className="flex flex-col gap-1">
          {title ? <p className="font-medium">{title}</p> : null}
          {children ? <div className="text-sm">{children}</div> : null}
          {action ? <div className="mt-1">{action}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export { StatusPanel }
export type { StatusPanelProps, StatusPanelVariant }
