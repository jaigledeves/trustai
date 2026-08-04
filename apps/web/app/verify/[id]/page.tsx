import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../../components/landing/Footer";
import { HashOnlyCard } from "../../../components/verify/HashOnlyCard";
import { UploadVerdictPanel } from "../../../components/verify/UploadVerdictPanel";
import { Button } from "../../../components/ui/button";
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
 *
 * The header/nav (section links, Wordmark) now lives in
 * `verify/[id]/layout.tsx` (spec: web-visual-coherence — Decision 7): it
 * must persist across this segment's `loading.tsx`/`not-found.tsx`, not
 * just this page.
 */
export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;
  const t = verifyDictionary.page;

  return (
    <>
      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-10%,var(--accent),transparent)]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
          {config.publicVerificationEnabled ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {t.badge}
                </span>
                <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {t.title}
                </h1>
                <p className="mt-3 max-w-lg text-muted-foreground text-pretty">{t.subtitle}</p>
              </div>

              <div className="mt-10">
                <HashOnlyCard id={id} />
              </div>
              <div className="mt-8">
                <UploadVerdictPanel id={id} />
              </div>

              {/* Single conversion point (spec: web-public-verify — No-Auth
                  Access still holds: this is an optional invite to /register,
                  not a login prompt). Highest-intent moment: the visitor just
                  saw the proof work. */}
              <div className="mt-10 rounded-2xl border border-border bg-gradient-to-b from-accent/50 to-background px-8 py-10 text-center shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight text-balance">
                  {verifyDictionary.cta.title}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty">
                  {verifyDictionary.cta.subtitle}
                </p>
                <Button size="lg" asChild className="mt-6">
                  <Link href="/register">
                    {verifyDictionary.cta.button}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <p role="status" className="text-center text-muted-foreground">
              {t.disabledMessage}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
