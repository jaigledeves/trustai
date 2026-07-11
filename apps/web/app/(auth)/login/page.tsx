import Link from "next/link";
import { LoginForm } from "../../../components/auth/LoginForm";
import { Wordmark } from "../../../components/brand/Wordmark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { authDictionary } from "../../../dictionaries/es/auth";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,var(--accent),transparent)]"
      />
      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="mx-auto">
          <Wordmark />
        </Link>
        <Card size="default" className="p-2">
          <CardHeader>
            <CardTitle className="text-xl">
              {authDictionary.login.title}
            </CardTitle>
            <CardDescription>{authDictionary.login.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LoginForm />
            <p className="text-center text-sm text-muted-foreground">
              {authDictionary.login.registerPrompt}{" "}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {authDictionary.login.registerCta}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
