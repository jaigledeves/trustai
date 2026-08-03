import {
  FileSignature,
  GraduationCap,
  Palette,
  Receipt,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { landingDictionary } from "@/dictionaries/es/landing";

const ITEM_ICONS = [
  FileSignature,
  GraduationCap,
  Receipt,
  Palette,
  Scale,
  ShieldCheck,
];

/**
 * Use-cases section (spec: public-landing — Content-Audit Accuracy). Copy
 * is audited to claim only unmodified-since-timestamp integrity, never
 * authorship/ownership/issuer legitimacy (`dictionaries.test.ts`).
 */
export function UseCases() {
  const t = landingDictionary.useCases;

  return (
    <section
      id="casos"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          {t.title}
        </h2>
        <p className="mt-3 text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map((item, i) => {
          const Icon = ITEM_ICONS[i]!;
          return (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="text-lg font-medium text-card-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
