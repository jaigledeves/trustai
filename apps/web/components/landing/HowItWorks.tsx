import { Boxes, FileCheck, Sparkles, Upload } from "lucide-react";
import { landingDictionary } from "@/dictionaries/es/landing";

const STEP_ICONS = [Upload, Sparkles, FileCheck, Boxes];

/**
 * "How it works" section (spec: public-landing — Landing Composition,
 * Content-Audit Accuracy). Server Component; the 4 steps and their icons
 * are rendered by index, copy from `landingDictionary.how`.
 */
export function HowItWorks() {
  const t = landingDictionary.how;

  return (
    <section
      id="como-funciona"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          {t.title}
        </h2>
        <p className="mt-3 text-muted-foreground">{t.subtitle}</p>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {t.steps.map((step, i) => {
          const Icon = STEP_ICONS[i]!;
          return (
            <li
              key={step.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
