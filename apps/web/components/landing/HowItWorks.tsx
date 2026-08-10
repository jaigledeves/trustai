import {
  Anchor,
  ArrowUpRight,
  Boxes,
  Braces,
  FileCheck,
  FileJson,
  Hash,
  Lock,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { glossaryDictionary } from "@/dictionaries/es/glossary";
import { landingDictionary } from "@/dictionaries/es/landing";
import { QuickHelp } from "../ui/quick-help";
import { ANCHOR_CONTRACT, contractUrl } from "./contractUrl";

const STEP_ICONS = [Upload, Sparkles, FileCheck, Boxes];

/** Order matches `how.technicalDetail.items` (Cifrado, DTR contents,
 * canonical serialization, hash, on-chain anchor, independent verification). */
const DETAIL_ICONS = [Lock, FileJson, Braces, Hash, Anchor, ShieldCheck];

const TRUNCATED_CONTRACT = `${ANCHOR_CONTRACT.slice(0, 6)}…${ANCHOR_CONTRACT.slice(-4)}`;

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
              {/* Step 4 ("Se ancla en blockchain") is where a non-technical
                  reader meets "blockchain" in the default-visible flow, so the
                  quick-help lives HERE — not buried inside "Ver el detalle
                  técnico", whose readers already know the term. A <div>, not a
                  <p>: QuickHelp renders a <details> (flow content) internally. */}
              {i === 3 ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  <QuickHelp
                    term={glossaryDictionary.blockchain.term}
                    definition={glossaryDictionary.blockchain.definition}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <details className="group mt-10 rounded-2xl border border-border bg-card px-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-card-foreground marker:content-none">
          {t.technicalDetailLabel}
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="pb-5 text-sm leading-relaxed text-muted-foreground">
          <p>{t.technicalDetail.intro}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {t.technicalDetail.items.map((item, i) => {
              const Icon = DETAIL_ICONS[i]!;
              return (
                <div
                  key={item.term}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-card-foreground">
                    {item.term}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Anchor className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {t.technicalDetail.contractLabel}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {TRUNCATED_CONTRACT}
                </p>
              </div>
            </div>

            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:text-primary sm:self-auto"
            >
              {t.technicalDetail.contractLinkLabel}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </details>
    </section>
  );
}
