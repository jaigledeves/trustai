import Link from "next/link";
import { Button } from "@/components/ui/button";
import { landingDictionary } from "@/dictionaries/es/landing";

/**
 * Final call-to-action section (spec: public-landing — Landing
 * Composition, Config-Driven Navigation & Links). `/register` is a static
 * route, never conditional — no config guard needed here.
 */
export function FinalCta() {
  const t = landingDictionary.cta;

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t.title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t.subtitle}</p>
      <Button size="lg" className="mt-8" asChild>
        <Link href="/register">{t.button}</Link>
      </Button>
    </section>
  );
}
