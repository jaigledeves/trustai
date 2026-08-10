"use client";

import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface QuickHelpProps {
  /** The jargon term being explained (used to build the default accessible name). */
  term: string;
  /** Plain-language definition, rendered in the disclosure body. */
  definition: string;
  /** Optional override for the trigger's accessible name. */
  label?: string;
  className?: string;
}

/**
 * Reusable, accessible quick-help affordance (spec: web-plain-language —
 * "Reusable Accessible Quick-Help Affordance"). Wraps a native
 * `<details>/<summary>` in a small client component: `open` is fully
 * React-controlled (rather than left to the browser's native toggle) so a
 * single source of truth drives both the Escape-to-close requirement and
 * explicit Enter/Space activation — jsdom (this repo's test environment)
 * does not translate a keyboard Enter/Space press into a native `<summary>`
 * toggle the way real browsers do, so that activation is handled here
 * explicitly instead of relying on native behavior alone.
 */
export function QuickHelp({ term, definition, label, className }: QuickHelpProps) {
  const [open, setOpen] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);
  const contentId = useId();

  function handleClick(event: MouseEvent<HTMLElement>) {
    // The native <details> toggle is cancelled so React's `open` state stays
    // the single source of truth (no DOM/state drift).
    event.preventDefault();
    setOpen((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      summaryRef.current?.focus();
    }
  }

  return (
    <details open={open} className={cn("inline-block", className)}>
      <summary
        ref={summaryRef}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="inline cursor-pointer list-none underline decoration-dotted underline-offset-2 marker:content-none"
      >
        {label ?? term}
      </summary>
      {open ? (
        <div id={contentId} className="mt-1 text-sm text-muted-foreground">
          {definition}
        </div>
      ) : null}
    </details>
  );
}
