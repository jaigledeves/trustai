import { cookies } from "next/headers";
import Link from "next/link";
import { Wordmark } from "../../../components/brand/Wordmark";
import { HeaderAuthActions } from "../../../components/shell/HeaderAuthActions";
import { ThemeToggle } from "../../../components/shell/ThemeToggle";
import { landingDictionary } from "../../../dictionaries/es/landing";
import { shellDictionary } from "../../../dictionaries/es/shell";
import { getSession } from "../../../lib/session";
import { parseThemePreference, THEME_COOKIE_NAME } from "../../../lib/theme";

/**
 * Landing section links reused as CROSS-PAGE anchors (`/#id`, not `#id`): those
 * sections live on the landing, not here, so each link navigates to `/` and
 * scrolls to the section. `verificacion` is deliberately omitted — pointing to
 * the landing's *demo* verification section from a real verification page would
 * be confusing. Labels come from the landing dictionary (single source, RNF-041).
 */
const sectionLinks = [
  { href: "/#como-funciona", label: landingDictionary.nav.sectionLinks.howItWorks },
  { href: "/#casos", label: landingDictionary.nav.sectionLinks.useCases },
  { href: "/#faq", label: landingDictionary.nav.sectionLinks.faq },
] as const;

/**
 * Persistent header/nav for the public verify segment (spec:
 * web-visual-coherence — Decision 7, user-resolved Option B). Extracted
 * out of `page.tsx` so `loading.tsx`/`not-found.tsx` render WITH this
 * header instead of as bare self-contained fallbacks — `notFound()` (from
 * `HashOnlyCard`) and the Suspense boundary only replace the segment
 * content, never this layout.
 *
 * Session-aware: renders the shared `HeaderAuthActions` cluster — same
 * component the landing `Nav` uses (spec: web-public-verify — Unified
 * Header Auth Cluster on Verify). Authenticated visitors see "Mis DTR" +
 * "Cerrar sesión" instead of the public landing section links — they don't
 * need to be sold on the product and have no way back to their dashboard
 * otherwise. This page never forces a login (spec: web-public-verify —
 * No-Auth Access).
 */
export default async function VerifyIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isAuthenticated = !!session;

  // spec: web-theme — "Theme Toggle Control" is required on this public
  // verify nav too (scenario explicitly names `/verify/[id]`), regardless
  // of auth state — this page never gates on login (No-Auth Access).
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href={isAuthenticated ? "/dtrs" : "/"}
            aria-label={shellDictionary.appName}
          >
            <Wordmark />
          </Link>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              /* Public: landing section links (desktop only) */
              <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
                {sectionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            <ThemeToggle initialPreference={themePreference} />
            <HeaderAuthActions isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
