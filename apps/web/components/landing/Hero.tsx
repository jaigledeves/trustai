import { Check, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { landingDictionary } from "@/dictionaries/es/landing";
import { config } from "@/lib/config";
import { contractUrl } from "./contractUrl";

/**
 * Landing hero (spec: public-landing — Landing Composition, Config-Driven
 * Navigation & Links). Server Component that reads `config.demoDtrId`
 * directly: the secondary CTA to `/verify/${demoDtrId}` only renders when
 * an operator has set a real certified demo DTR (see `lib/config.ts`).
 */
export function Hero() {
  const t = landingDictionary.hero;

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            {t.badge}
          </a>

          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t.title}
          </h1>

          <p className="max-w-lg text-lg text-muted-foreground text-pretty">
            {t.subtitle}
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">{t.primaryCta}</Link>
            </Button>
            {config.demoDtrId ? (
              <Button variant="outline" size="lg" asChild>
                <Link href={`/verify/${config.demoDtrId}`}>
                  {t.secondaryCta}
                </Link>
              </Button>
            ) : null}
          </div>

          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {t.valueProps.map((valueProp) => (
              <li key={valueProp} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-600" />
                {valueProp}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-accent to-transparent blur-2xl"
          />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.card.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                <Check className="size-3.5" />
                {t.card.statusBadge}
              </span>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <FileText className="size-5" />
              </span>
              <div>
                <p className="font-medium text-card-foreground">{t.card.fileName}</p>
                <p className="text-sm text-muted-foreground">{t.card.fileMeta}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t.card.hashLabel}</dt>
                <dd className="font-mono text-xs text-card-foreground">
                  {t.card.hashValue}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t.card.networkLabel}</dt>
                <dd className="font-medium text-card-foreground">{t.card.network}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t.card.txLabel}</dt>
                <dd className="font-mono text-xs text-primary underline underline-offset-2">
                  {t.card.txValue}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600">{t.card.footerNote}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
