import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { landingDictionary } from "@/dictionaries/es/landing";

/**
 * Landing nav (spec: public-landing — Landing Composition). Server
 * Component — no client JS needed for two static links + the wordmark.
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/login">{landingDictionary.nav.login}</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/register">{landingDictionary.nav.register}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
