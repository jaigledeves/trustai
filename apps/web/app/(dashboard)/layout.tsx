import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "../../components/shell/LogoutButton";
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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">{shellDictionary.appName}</span>
        <nav className="flex items-center gap-4">
          <Link href="/dtrs">{shellDictionary.nav.dtrs}</Link>
          <Link href="/dtrs/new">{shellDictionary.nav.newCertification}</Link>
          <LogoutButton />
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
