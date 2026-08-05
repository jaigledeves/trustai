import Link from "next/link";
import { ForgotPasswordForm } from "../../../components/auth/ForgotPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { authDictionary } from "../../../dictionaries/es/auth";

export default function ForgotPasswordPage() {
  return (
    <Card size="default" className="p-2">
      <CardHeader>
        <CardTitle className="text-xl">
          {authDictionary.forgotPassword.title}
        </CardTitle>
        <CardDescription>
          {authDictionary.forgotPassword.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          {authDictionary.forgotPassword.loginPrompt}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {authDictionary.forgotPassword.loginCta}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
