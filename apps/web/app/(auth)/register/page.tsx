import Link from "next/link";
import { RegisterForm } from "../../../components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { authDictionary } from "../../../dictionaries/es/auth";

export default function RegisterPage() {
  return (
    <Card size="default" className="p-2">
      <CardHeader>
        <CardTitle className="text-xl">
          {authDictionary.register.title}
        </CardTitle>
        <CardDescription>
          {authDictionary.register.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          {authDictionary.register.loginPrompt}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {authDictionary.register.loginCta}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
