import { RegisterForm } from "../../../components/auth/RegisterForm";
import { authDictionary } from "../../../dictionaries/es/auth";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{authDictionary.register.title}</h1>
      <RegisterForm />
    </main>
  );
}
