import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FilePlus } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "../../components/brand/Wordmark";
import { LogoutButton } from "../../components/shell/LogoutButton";
import { ThemeToggle } from "../../components/shell/ThemeToggle";
import { Button } from "../../components/ui/button";
import { shellDictionary } from "../../dictionaries/es/shell";
import { getSession } from "../../lib/session";
import { parseThemePreference, THEME_COOKIE_NAME } from "../../lib/theme";

/**
 * Authenticated shell (spec: web-app-shell). `middleware.ts` already
 * redirects unauthenticated `/dtrs/*` requests before this layout renders;
 * this `getSession()` check is belt-and-suspenders (design.md) — it also
 * gives us a real server-side session read to build the nav/logout affordance
 * from, not just a boolean.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // spec: web-theme — "Theme Toggle Control" (authenticated shell nav).
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dtrs" aria-label={shellDictionary.appName}>
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-1.5">
            <Button variant="ghost" size="lg" asChild>
              <Link href="/dtrs">{shellDictionary.nav.dtrs}</Link>
            </Button>
            {/* Icon only on mobile; icon + short label on sm+ to keep the
                button recognisable without crowding the nav. Full label
                stays in aria-label for screen readers at every width. */}
            <Button
              size="lg"
              aria-label={shellDictionary.nav.newCertification}
              asChild
            >
              <Link href="/dtrs/new" className="flex items-center gap-1.5">
                <FilePlus className="size-4 shrink-0" />
                <span className="hidden sm:inline">
                  {shellDictionary.nav.newCertificationShort}
                </span>
              </Link>
            </Button>
            <ThemeToggle initialPreference={themePreference} />
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
