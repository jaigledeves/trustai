import { notFound } from "next/navigation";
import { CertifyWizard } from "../../../../components/certify/CertifyWizard";
import { DtrDetailCard } from "../../../../components/history/DtrDetailCard";
import { ApiError } from "../../../../lib/api/errors";
import { serverFetch } from "../../../../lib/api/server-client";
import type { TrustRecordDetail, TrustRecordState } from "../../../../lib/api/types";

interface DtrDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}

/**
 * Terminal states have no interactive certification step left — the record is
 * a finished historical entry, so the detail route serves the read-only
 * `DtrDetailCard` (full timeline incl. AI analysis, spec: web-history "DTR
 * Detail View") instead of the wizard. A freshly-anchored record still reaches
 * CERTIFIED live inside the wizard's `AnchorPoller`; this branch only governs
 * what a fresh navigation renders, so the two views never collide.
 *
 * Only CERTIFIED is truly terminal. FAILED is a TRANSIENT auto-retried state
 * (confirm-anchor.handler flips FAILED->ANCHORING and re-enqueues), so a fresh
 * navigation on a FAILED record must render the interactive `CertifyWizard`
 * (which keeps polling to CERTIFIED), not the read-only card.
 */
const TERMINAL_STATES: readonly TrustRecordState[] = ["CERTIFIED"];

/**
 * State-driven detail route (spec: web-certify-wizard 3.9 + web-history 4.6).
 * RSC fetches the detail via `server-client` (Bearer attached server-side from
 * the session cookie). Active records (DRAFT/READY/ANCHORING/DISCARDED) render
 * the interactive `CertifyWizard` client island; terminal records render the
 * read-only `DtrDetailCard`.
 */
export default async function DtrDetailPage({ params, searchParams }: DtrDetailPageProps) {
  const { id } = await params;
  const { notice } = await searchParams;

  const record = await fetchRecord(id);
  if (!record) {
    // RNF-004: a cross-org id behaves identically to an unknown one.
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      {TERMINAL_STATES.includes(record.state) ? (
        <DtrDetailCard record={record} />
      ) : (
        <CertifyWizard
          id={id}
          initialRecord={record}
          showDuplicateNotice={notice === "duplicate"}
        />
      )}
    </main>
  );
}

async function fetchRecord(id: string): Promise<TrustRecordDetail | null> {
  try {
    return await serverFetch<TrustRecordDetail>(`/trust-records/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
