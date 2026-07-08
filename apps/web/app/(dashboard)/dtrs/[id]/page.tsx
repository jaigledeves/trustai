import { notFound } from "next/navigation";
import { CertifyWizard } from "../../../../components/certify/CertifyWizard";
import { ApiError } from "../../../../lib/api/errors";
import { serverFetch } from "../../../../lib/api/server-client";
import type { TrustRecordDetail } from "../../../../lib/api/types";

interface DtrDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}

/**
 * State-driven wizard shell (spec: web-certify-wizard, task 3.9). RSC
 * fetches the initial detail via `server-client` (Bearer attached
 * server-side from the session cookie); `CertifyWizard` (client island)
 * takes it from there and re-renders as the record's state advances.
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
      <CertifyWizard
        id={id}
        initialRecord={record}
        showDuplicateNotice={notice === "duplicate"}
      />
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
