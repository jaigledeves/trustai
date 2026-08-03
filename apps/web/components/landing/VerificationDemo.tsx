"use client";

import { useState } from "react";
import { landingDictionary } from "@/dictionaries/es/landing";
import { verifyDictionary } from "@/dictionaries/es/verify";
import { cn } from "@/lib/utils";

type VerifyVerdict = keyof typeof verifyDictionary.verdicts;

const VERDICT_ORDER: VerifyVerdict[] = [
  "VALID",
  "ASSET_MISMATCH",
  "PENDING_ANCHOR",
  "INVALID_RECORD",
];

/** Mirrors `UploadVerdictPanel`'s `isErrorVerdict` split. */
function isErrorVerdict(verdict: VerifyVerdict): boolean {
  return verdict === "ASSET_MISMATCH" || verdict === "INVALID_RECORD";
}

/**
 * Honest verification demo (spec: public-landing — Honest Verification
 * Demo). The only client-island section on the landing page: toggling one
 * of the four real backend verdicts renders `verifyDictionary.verdicts`
 * copy directly (never re-authored, zero drift risk from the real
 * `/verify/[id]` flow). The recompute disclosure below is **static,
 * descriptive copy only** — no `useEffect`/`sha256Hex` call — it never
 * claims the browser-recomputed file hash matches or verifies the
 * on-chain/canonical hash (design.md; guarded by `dictionaries.test.ts`'s
 * copy-audit assertions 8–9). The real, functional recompute
 * (`ClientHashRecompute`) stays exclusively on `/verify/[id]`.
 */
export function VerificationDemo() {
  const [verdict, setVerdict] = useState<VerifyVerdict>("VALID");
  const t = landingDictionary.verificationDemo;
  const copy = verifyDictionary.verdicts[verdict];

  return (
    <section
      id="verificacion"
      className="border-y border-border bg-gradient-to-b from-accent/50 to-background"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {t.badge}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
            {t.title}
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">{t.description}</p>

          <div
            role="group"
            aria-label={t.verdictGroupLabel}
            className="mt-6 flex flex-wrap gap-2"
          >
            {VERDICT_ORDER.map((key) => {
              const isSelected = key === verdict;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVerdict(key)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {verifyDictionary.verdicts[key].title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
          <div
            role={isErrorVerdict(verdict) ? "alert" : "status"}
            className={cn(
              "rounded-lg p-4",
              isErrorVerdict(verdict)
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-50 text-emerald-600",
            )}
          >
            <h3 className="font-semibold">{copy.title}</h3>
            <p className="mt-1 text-sm">{copy.message}</p>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
            <p className="text-muted-foreground">{t.recompute.statement}</p>
            <p className="text-xs text-muted-foreground">{t.recompute.caveat}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
