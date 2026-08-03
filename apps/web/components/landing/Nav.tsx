import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { landingDictionary } from "@/dictionaries/es/landing";

/**
 * In-page anchor links. Hrefs are structural (they target each section's
 * `id`, e.g. VerificationDemo's `id="verificacion"`), so they live here
 * rather than in the dictionary — same convention as the /login and
 * /register hrefs below. Only the labels are dictionary copy (RNF-041).
 * Plain same-page hash links: they only scroll, never touch auth or the
 * session proxy (which guards `/dtrs/*` only). Hidden on mobile to keep the
 * bar uncluttered; the login/register actions stay visible at every width.
 */
const sectionLinks = [
  { href: "#como-funciona", label: landingDictionary.nav.sectionLinks.howItWorks },
  { href: "#verificacion", label: landingDictionary.nav.sectionLinks.verification },
  { href: "#casos", label: landingDictionary.nav.sectionLinks.useCases },
  { href: "#faq", label: landingDictionary.nav.sectionLinks.faq },
] as const;

/**
 * Landing nav (spec: public-landing — Landing Composition). Server
 * Component — no client JS needed for the wordmark, in-page anchors, and
 * the two auth links.
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Wordmark />
        <nav
          aria-label="Secciones"
          className="hidden items-center gap-1 md:flex"
        >
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/login">{landingDictionary.nav.login}</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/register">{landingDictionary.nav.register}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
