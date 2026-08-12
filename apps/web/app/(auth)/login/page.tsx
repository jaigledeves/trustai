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
      </CardContent>
    </Card>
  );
}
