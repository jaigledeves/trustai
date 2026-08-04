"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { historyDictionary } from "../../dictionaries/es/history";
import { Button } from "../ui/button";

interface DtrPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Active filters to preserve when paging (spec: "navigating preserves filters"). */
  search?: string | undefined;
  state?: string | undefined;
}

/** Preserve active filters and set the target page. Order: state, search, page. */
function buildHref(
  pathname: string,
  params: { search?: string | undefined; state?: string | undefined; page: number },
): string {
  const searchParams = new URLSearchParams();
  if (params.state) {
    searchParams.set("state", params.state);
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }
  searchParams.set("page", String(params.page));
  return `${pathname}?${searchParams.toString()}`;
}

/**
 * Prev/next pagination for `/dtrs` (spec: web-dtr-list — "Pagination
 * Controls"). Prev is disabled on page 1, Next when the current page is the
 * last (`page * pageSize >= total`). Navigating sets the `page` URL param and
 * preserves the active `search`/`state`. Values arrive as props from the RSC.
 */
export function DtrPagination({ page, pageSize, total, search, state }: DtrPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirstPage = page <= 1;
  const isLastPage = page * pageSize >= total;
  const positionLabel = historyDictionary.list.paginationPosition
    .replace("{page}", String(page))
    .replace("{totalPages}", String(totalPages));

  function goTo(targetPage: number) {
    router.push(buildHref(pathname, { search, state, page: targetPage }), { scroll: false });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{positionLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFirstPage}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {historyDictionary.list.paginationPrevious}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLastPage}
          onClick={() => goTo(page + 1)}
        >
          {historyDictionary.list.paginationNext}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
