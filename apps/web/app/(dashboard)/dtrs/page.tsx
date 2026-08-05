import { DtrListControls } from "../../../components/history/DtrListControls";
import { DtrPagination } from "../../../components/history/DtrPagination";
import { DtrTable } from "../../../components/history/DtrTable";
import { Card } from "../../../components/ui/card";
import { historyDictionary } from "../../../dictionaries/es/history";
import { serverFetch } from "../../../lib/api/server-client";
import type { TrustRecordListResponse } from "../../../lib/api/types";

interface DtrsListPageProps {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
    state?: string | string[];
  }>;
}

/** The `TrustRecordState` values accepted as a filter — guards a hand-typed URL. */
const VALID_STATES = new Set(["DRAFT", "READY", "ANCHORING", "CERTIFIED", "FAILED", "DISCARDED"]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
}

function parseSearch(value: string | string[] | undefined): string | undefined {
  const raw = first(value)?.trim();
  return raw ? raw : undefined;
}

function parseState(value: string | string[] | undefined): string | undefined {
  const raw = first(value);
  return raw && VALID_STATES.has(raw) ? raw : undefined;
}

/**
 * Org-scoped DTR list (spec: web-dtr-list). RSC direct fetch to
 * `GET /trust-records` (per ADR-005 data strategy), now URL-driven: `page`,
 * `search`, and `state` are read from `searchParams` (a Promise in this
 * Next.js — must be awaited), guarded, and forwarded to the backend via
 * `serverFetch`'s `query`. The bad-state guard means a hand-typed URL never
 * reaches the API. Controls + pagination are client islands; the table stays a
 * server component. `hasActiveFilter` distinguishes a filtered no-match from a
 * truly empty org (spec: "Distinct Empty States").
 */
export default async function DtrsListPage({ searchParams }: DtrsListPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const search = parseSearch(params.search);
  const state = parseState(params.state);
  const hasActiveFilter = search !== undefined || state !== undefined;

  const list = await serverFetch<TrustRecordListResponse>("/trust-records", {
    query: { page, search, state },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{historyDictionary.list.title}</h1>
        <p className="text-sm text-muted-foreground">{historyDictionary.list.subtitle}</p>
      </div>
      <Card className="flex flex-col gap-6 p-6">
        <DtrListControls search={search} state={state} />
        <DtrTable items={list.items} total={list.total} hasActiveFilter={hasActiveFilter} />
        {list.total > 0 ? (
          <DtrPagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            search={search}
            state={state}
          />
        ) : null}
      </Card>
    </main>
  );
}
