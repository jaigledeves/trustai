import { Wordmark } from "@/components/brand/Wordmark";
import { landingDictionary } from "@/dictionaries/es/landing";
import { contractUrl } from "./contractUrl";

/**
 * Landing footer (spec: public-landing — Landing Composition,
 * Config-Driven Navigation & Links). `contractUrl` comes from the shared
 * `contractUrl.ts` module, same source as `Hero`'s badge link.
 */
export function Footer() {
  const t = landingDictionary.footer;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <Wordmark iconOnly />
          <span>{t.tagline}</span>
        </div>
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.contractLabel}
          </a>
          <span>{t.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
