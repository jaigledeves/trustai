"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useState } from "react";
import { historyDictionary } from "../../dictionaries/es/history";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

/** Debounce so every keystroke doesn't push a history entry / refetch. */
const SEARCH_DEBOUNCE_MS = 300;

/** Mirrors `TrustRecordState` (lib/api/types.ts) — the filterable states. */
const STATES = ["DRAFT", "READY", "ANCHORING", "CERTIFIED", "FAILED", "DISCARDED"] as const;

interface DtrListControlsProps {
  /** The currently-applied filename search (from the URL), or undefined. */
  search?: string | undefined;
  /** The currently-applied `TrustRecordState` filter (from the URL), or undefined. */
  state?: string | undefined;
}

/**
 * Build a `/dtrs` href from the active filters. `page` is deliberately
 * omitted, so changing any filter resets to page 1 (spec: web-dtr-list —
 * "Changing a filter resets to page 1"). Order (state, search) is stable so
 * URLs are predictable.
 */
function buildHref(
  pathname: string,
  params: { search?: string | undefined; state?: string | undefined },
): string {
  const searchParams = new URLSearchParams();
  if (params.state) {
    searchParams.set("state", params.state);
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * URL-driven search + state filter for `/dtrs` (spec: web-dtr-list — "List
 * Search & Filter Controls"). Current values arrive as props from the RSC —
 * deliberately NOT `useSearchParams`, which would force a Suspense boundary
 * during prerender. Search is debounced (`router.replace`, no history spam);
 * state changes push immediately. Every change resets to page 1.
 */
export function DtrListControls({ search, state }: DtrListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(search ?? "");

  useEffect(() => {
    const applied = search ?? "";
    const handle = setTimeout(() => {
      const next = searchValue.trim();
      if (next === applied) {
        return;
      }
      router.replace(buildHref(pathname, { search: next || undefined, state }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchValue, search, state, pathname, router]);

  function handleStateChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextState = event.target.value || undefined;
    router.push(
      buildHref(pathname, { search: searchValue.trim() || undefined, state: nextState }),
      { scroll: false },
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="dtr-search">{historyDictionary.list.searchLabel}</Label>
        <Input
          id="dtr-search"
          type="search"
          value={searchValue}
          placeholder={historyDictionary.list.searchPlaceholder}
          onChange={(event) => setSearchValue(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dtr-state">{historyDictionary.list.stateFilterLabel}</Label>
        <select
          id="dtr-state"
          value={state ?? ""}
          onChange={handleStateChange}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56"
        >
          <option value="">{historyDictionary.list.stateFilterAll}</option>
          {STATES.map((stateOption) => (
            <option key={stateOption} value={stateOption}>
              {historyDictionary.states[stateOption]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
