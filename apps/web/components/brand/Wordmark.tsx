import { cn } from "@/lib/utils";

/**
 * Ancrux wordmark: an anchor-with-block-node glyph (A3.2 design) in a
 * brand tile plus the product name. The anchor's ring (top) + block node
 * (crux/blockchain block, mid) + arc arms (bottom) encode the product
 * concept — document fingerprint anchored to a chain block. Pure SVG +
 * CSS (no image asset) so it stays crisp and theme-aware.
 * Used in the landing nav/footer and the authenticated shell.
 */
export function Wordmark({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          aria-hidden="true"
        >
          {/* Ring — the anchor's eye / top loop */}
          <circle cx="12" cy="4.9" r="1.9" stroke="currentColor" strokeWidth="1.7" />
          {/* Shank — vertical shaft connecting ring → block → arms */}
          <line x1="12" y1="6.8" x2="12" y2="21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          {/* Block node — the blockchain block, the crux where the fingerprint is anchored */}
          <rect x="9.8" y="10.1" width="4.4" height="4.4" rx="1.3" fill="currentColor" />
          {/* Arms — the anchor arc at the base */}
          <path d="M6.6 14.6H4.7a7.3 7.3 0 0 0 14.6 0h-1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      {iconOnly ? null : (
        <span className="text-lg font-semibold tracking-tight">
          Ancr<span className="text-primary">ux</span>
        </span>
      )}
    </span>
  );
}
