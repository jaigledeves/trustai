import { BrainCircuit, Fingerprint, Search } from "lucide-react";
import { landingDictionary } from "@/dictionaries/es/landing";

const PILLAR_ICONS = [Search, Fingerprint, BrainCircuit];

/**
 * Trust pillars section (spec: public-landing — Landing Composition).
 * Server Component, three distinct icons per design.md's styling note.
 */
export function Pillars() {
  const t = landingDictionary.pillars;

  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-balance">
          {t.title}
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {t.items.map((item, i) => {
            const Icon = PILLAR_ICONS[i]!;
            return (
              <div key={item.title} className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
