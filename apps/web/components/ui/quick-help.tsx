"use client";

import { Info } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface QuickHelpProps {
  /**
   * The "¿Qué es…?" heading. Shown in bold at the top of the panel AND used
   * as the accessible name of the ⓘ trigger (so screen readers announce
   * e.g. "¿Qué significa anclar?, button").
   */
  title: string;
  /** Plain-language explanation body, rendered under the title. */
  definition: string;
  className?: string;
}

/**
 * Reusable, accessible quick-help affordance (spec: web-plain-language —
 * "Reusable Accessible Quick-Help Affordance"). Renders an ⓘ info icon at
 * the end of a phrase; activating it discloses a small panel with a
 * "¿Qué es…?" heading and a plain-language explanation. The icon signals
 * "more info" without depending on any specific word being present in the
 * surrounding copy, so the help never ends up orphaned next to text that
 * doesn't contain the term.
 *
 * Built on a native `<details>/<summary>` wrapped in a client component:
 * `open` is fully React-controlled so a single source of truth drives both
 * the Escape-to-close requirement and explicit Enter/Space activation —
 * jsdom (this repo's test environment) does not translate a keyboard
 * Enter/Space press into a native `<summary>` toggle the way real browsers
 * do, so activation is handled here explicitly.
 */
export function QuickHelp({ title, definition, className }: QuickHelpProps) {
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
    <details open={open} className={cn("inline-block align-middle", className)}>
      <summary
        ref={summaryRef}
        role="button"
        tabIndex={0}
        aria-label={title}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="inline-flex cursor-pointer list-none items-center text-muted-foreground transition-colors marker:content-none hover:text-primary"
      >
        <Info className="size-4" aria-hidden="true" />
      </summary>
      {open ? (
        <div
          id={contentId}
          role="note"
          className="mt-2 max-w-sm rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground shadow-sm"
        >
          <p className="font-medium text-card-foreground">{title}</p>
          <p className="mt-1 leading-relaxed">{definition}</p>
        </div>
      ) : null}
    </details>
  );
}
