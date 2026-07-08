import Link from "next/link";
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
 * error state, never a silent redirect.
 */
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const verified = token ? await verifyToken(token) : false;

  if (verified) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">
          {authDictionary.verifyEmail.successTitle}
        </h1>
        <p>{authDictionary.verifyEmail.successMessage}</p>
        <Link href="/login" className="underline">
          {authDictionary.verifyEmail.successCta}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">
        {authDictionary.verifyEmail.errorTitle}
      </h1>
      <p role="alert">{authDictionary.verifyEmail.errorMessage}</p>
    </main>
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
