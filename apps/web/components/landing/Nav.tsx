import { cookies } from "next/headers";
import { Wordmark } from "@/components/brand/Wordmark";
import { HeaderAuthActions } from "@/components/shell/HeaderAuthActions";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { landingDictionary } from "@/dictionaries/es/landing";
import { getSession } from "@/lib/session";
import { parseThemePreference, THEME_COOKIE_NAME } from "@/lib/theme";

/**
 * In-page anchor links. Hrefs are structural (they target each section's
 * `id`, e.g. VerificationDemo's `id="verificacion"`), so they live here
 * rather than in the dictionary — same convention as the /login and
 * /register hrefs below. Only the labels are dictionary copy (RNF-041).
 * Plain same-page hash links: they only scroll, never touch auth or the
 * session proxy (which guards `/dtrs/*` only). Hidden on mobile to keep the
 * bar uncluttered; the auth cluster (`HeaderAuthActions`) stays visible at
 * every width.
 */
const sectionLinks = [
  { href: "#como-funciona", label: landingDictionary.nav.sectionLinks.howItWorks },
  { href: "#verificacion", label: landingDictionary.nav.sectionLinks.verification },
  { href: "#casos", label: landingDictionary.nav.sectionLinks.useCases },
  { href: "#faq", label: landingDictionary.nav.sectionLinks.faq },
] as const;

/**
 * Landing nav (spec: public-landing — Landing Composition, Session-Aware
 * Nav Auth Affordance; web-theme — "Theme Toggle Control"). Server
 * Component — reads the `theme` cookie to SSR-resolve `ThemeToggle`'s
 * `initialPreference` (design.md decision #4: landing reuses
 * `shellDictionary.theme`, not its own dictionary group), and reads the
 * session cookie via `getSession()` to render the shared
 * `HeaderAuthActions` cluster — same component `verify/[id]/layout.tsx`
 * uses, so both public surfaces present one consistent auth entry point.
 */
export async function Nav() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );

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
          <ThemeToggle initialPreference={themePreference} />
          <HeaderAuthActions isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </header>
  );
}
