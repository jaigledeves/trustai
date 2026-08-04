import { DtrTable } from "../../../components/history/DtrTable";
import { Card } from "../../../components/ui/card";
import { historyDictionary } from "../../../dictionaries/es/history";
import { serverFetch } from "../../../lib/api/server-client";
import type { TrustRecordListResponse } from "../../../lib/api/types";

/**
 * Org-scoped DTR list (spec: web-history — "Org-Scoped DTR List", task 4.4).
 * RSC direct fetch via `server-client` to `GET /trust-records` (Slice 2,
 * design.md's "List: RSC direct fetch" data strategy) — no client hook,
 * no pagination controls in this MVP slice (default page=1/pageSize=20).
 * The table renders inside the reference `Card` primitive (spec:
 * web-visual-coherence — "Consistent Card Container").
 */
export default async function DtrsListPage() {
  const list = await serverFetch<TrustRecordListResponse>("/trust-records");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {historyDictionary.list.title}
      </h1>
      <Card className="p-6">
        <DtrTable items={list.items} total={list.total} />
      </Card>
    </main>
  );
}
