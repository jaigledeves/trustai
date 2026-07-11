import { cn } from "@/lib/utils";

/**
 * TrustAI wordmark: a shield-with-check glyph in a brand-gradient tile plus
 * the product name. Pure SVG + CSS (no image asset) so it stays crisp and
 * theme-aware. Used in the landing nav/footer and the authenticated shell.
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
          <path
            d="M12 2.5 4.5 5.5v5.2c0 4.4 2.9 8.5 7.5 10.3 4.6-1.8 7.5-5.9 7.5-10.3V5.5L12 2.5Z"
            fill="currentColor"
            opacity="0.18"
          />
          <path
            d="M12 2.5 4.5 5.5v5.2c0 4.4 2.9 8.5 7.5 10.3 4.6-1.8 7.5-5.9 7.5-10.3V5.5L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m8.75 11.75 2.25 2.25 4.25-4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {iconOnly ? null : (
        <span className="text-lg font-semibold tracking-tight">
          Trust<span className="text-primary">AI</span>
        </span>
      )}
    </span>
  );
}
