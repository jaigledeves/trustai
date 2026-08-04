import Link from "next/link";
import { LoginForm } from "../../../components/auth/LoginForm";
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
  );
}
