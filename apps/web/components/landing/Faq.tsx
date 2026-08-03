import { landingDictionary } from "@/dictionaries/es/landing";

/**
 * FAQ section (spec: public-landing — Landing Composition). Native
 * `<details>/<summary>` — no client JS needed, keeps this a Server
 * Component (design.md's FAQ interactivity decision).
 */
export function Faq() {
  const t = landingDictionary.faq;

  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto w-full max-w-3xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            {t.title}
          </h2>
          <p className="mt-3 text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {t.items.map((item) => (
            <details key={item.question} className="group px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-card-foreground marker:content-none">
                {item.question}
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
