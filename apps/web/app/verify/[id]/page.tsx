import type { Metadata } from "next";
import { HashOnlyCard } from "../../../components/verify/HashOnlyCard";
import { UploadVerdictPanel } from "../../../components/verify/UploadVerdictPanel";
import { verifyDictionary } from "../../../dictionaries/es/verify";
import { config } from "../../../lib/config";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  await params;
  return {
    title: `${verifyDictionary.page.title} — TrustAI`,
    description: verifyDictionary.page.title,
    openGraph: {
      title: verifyDictionary.page.title,
      description: verifyDictionary.page.title,
    },
  };
}

/**
 * Public, no-auth verification page (spec: "No-Auth Access") — reachable
 * via a shared QR/URL, deliberately outside the `(dashboard)` route group:
 * no session check, no login prompt, ever (design.md's proxy/middleware
 * only guards `/dtrs/*`). Dark-renders the "no disponible" state instead
 * of a failed fetch when the backend's public-verification module isn't
 * mounted (`NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED=false` mirrors the
 * backend's own flag).
 */
export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;

  if (!config.publicVerificationEnabled) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <p role="status">{verifyDictionary.page.disabledMessage}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{verifyDictionary.page.title}</h1>
      <HashOnlyCard id={id} />
      <UploadVerdictPanel id={id} />
    </main>
  );
}
