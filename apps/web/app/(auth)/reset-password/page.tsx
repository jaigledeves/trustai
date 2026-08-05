import Link from "next/link";
import { ResetPasswordForm } from "../../../components/auth/ResetPasswordForm";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { StatusPanel } from "../../../components/ui/status-panel";
import { authDictionary } from "../../../dictionaries/es/auth";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Server Component shell (spec: "Invalid or Expired Token Web Handling").
 * Reads `?token=` before rendering — a missing token is caught here,
 * before the client form ever mounts, so there is never a state that lets
 * a user submit a reset request with no token at all. Renders under
 * `(auth)/layout.tsx`, which already provides the gradient + Wordmark +
 * Card-column wrapper (mirrors `verify-email/page.tsx`).
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <StatusPanel
        variant="error"
        title={authDictionary.resetPassword.errorTitle}
        action={
          <Button size="lg" variant="outline" asChild>
            <Link href="/forgot-password">
              {authDictionary.resetPassword.errorCta}
            </Link>
          </Button>
        }
      >
        {authDictionary.resetPassword.errorMessage}
      </StatusPanel>
    );
  }

  return (
    <Card size="default" className="p-2">
      <CardHeader>
        <CardTitle className="text-xl">
          {authDictionary.resetPassword.title}
        </CardTitle>
        <CardDescription>
          {authDictionary.resetPassword.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
