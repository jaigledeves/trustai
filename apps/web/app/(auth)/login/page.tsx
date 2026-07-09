import { LoginForm } from "../../../components/auth/LoginForm";
import { authDictionary } from "../../../dictionaries/es/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{authDictionary.login.title}</h1>
      <LoginForm />
    </main>
  );
}
