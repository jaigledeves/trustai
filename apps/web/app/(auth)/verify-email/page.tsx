import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { StatusPanel } from "../../../components/ui/status-panel";
import { authDictionary } from "../../../dictionaries/es/auth";
import { ApiError } from "../../../lib/api/errors";
import { serverFetch } from "../../../lib/api/server-client";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Server Component (spec: "Email Verification Landing"). Calls
 * `GET /auth/verify-email?token=` on load and renders a distinct outcome
 * for a valid vs. invalid/expired token — an expired link is an explicit
 * error state, never a silent redirect. Renders under `(auth)/layout.tsx`,
 * which already provides the gradient + Wordmark + Card-column wrapper, so
 * this only needs the status content (spec: web-visual-coherence — "Auth
 * Surface Cohesion").
 */
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const verified = token ? await verifyToken(token) : false;

  if (verified) {
    return (
      <StatusPanel
        variant="success"
        title={authDictionary.verifyEmail.successTitle}
        action={
          <Button size="lg" asChild>
            <Link href="/login">{authDictionary.verifyEmail.successCta}</Link>
          </Button>
        }
      >
        {authDictionary.verifyEmail.successMessage}
      </StatusPanel>
    );
  }

  return (
    <StatusPanel
      variant="error"
      title={authDictionary.verifyEmail.errorTitle}
      action={
        <Button size="lg" variant="outline" asChild>
          <Link href="/register">{authDictionary.login.registerCta}</Link>
        </Button>
      }
    >
      {authDictionary.verifyEmail.errorMessage}
    </StatusPanel>
  );
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    await serverFetch<{ verified: true }>("/auth/verify-email", {
      query: { token },
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      return false;
    }
    throw error;
  }
}
