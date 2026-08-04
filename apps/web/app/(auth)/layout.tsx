import Link from "next/link";
import { Wordmark } from "../../components/brand/Wordmark";

/**
 * Shared auth surface layout (spec: web-visual-coherence — "Auth Surface
 * Cohesion"). Renders the gradient overlay + Wordmark once for
 * login/register/verify-email so each page keeps only its `Card`/content.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        data-slot="auth-gradient"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]"
      />
      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="mx-auto">
          <Wordmark />
        </Link>
        {children}
      </div>
    </main>
  );
}
