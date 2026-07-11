import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "../../components/brand/Wordmark";
import { LogoutButton } from "../../components/shell/LogoutButton";
import { Button } from "../../components/ui/button";
import { shellDictionary } from "../../dictionaries/es/shell";
import { getSession } from "../../lib/session";

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
            <Button size="lg" asChild>
              <Link href="/dtrs/new">{shellDictionary.nav.newCertification}</Link>
            </Button>
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
