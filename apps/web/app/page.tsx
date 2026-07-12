import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { landingDictionary as t } from "@/dictionaries/es/landing";
import { config } from "@/lib/config";

// Public marketing landing (route "/"). Replaces the old
// `redirect("/login")` placeholder: the deployed URL's first impression is
// now a real product page, and `proxy.ts` still guards `/dtrs/*` behind a
// session. Server Component — no client JS needed.

// Public info: the live AnchorRegistry on Base Sepolia (docs/12-Deployment.md).
const ANCHOR_CONTRACT = "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22";
const contractUrl = `${config.chainExplorerBaseUrl}/address/${ANCHOR_CONTRACT}`;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="lg" asChild>
              <Link href="/login">{t.nav.login}</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/register">{t.nav.register}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_-10%,var(--accent),transparent)]"
          />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              {t.hero.badge}
            </a>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              {t.hero.title}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
              {t.hero.subtitle}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">{t.hero.primaryCta}</Link>
              </Button>
              {config.demoDtrId ? (
                <Button variant="secondary" size="lg" asChild>
                  <Link href={`/verify/${config.demoDtrId}`}>
                    {t.hero.demoCta}
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" size="lg" asChild>
                <Link href="#como-funciona">{t.hero.secondaryCta}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="como-funciona"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              {t.how.title}
            </h2>
            <p className="mt-3 text-muted-foreground">{t.how.subtitle}</p>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.how.steps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Trust pillars */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              {t.pillars.title}
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {t.pillars.items.map((item) => (
                <div key={item.title} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 12.5 4.5 4.5L19 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t.cta.subtitle}
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/register">{t.cta.button}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Wordmark iconOnly />
            <span>{t.footer.tagline}</span>
          </div>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t.footer.contractLabel}
            </a>
            <span>{t.footer.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
