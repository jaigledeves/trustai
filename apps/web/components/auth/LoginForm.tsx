"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authDictionary } from "../../dictionaries/es/auth";
import { shellDictionary } from "../../dictionaries/es/shell";
import { validateLoginForm, type LoginFormErrors } from "../../lib/validation/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { StatusPanel } from "../ui/status-panel";

/** Login form (spec: "Login and Session Establishment"). Submits to the
 * dedicated `/api/auth/login` route handler — the only place a session
 * cookie is ever set — then does a full navigation to `/dtrs` so
 * `middleware.ts` and every RSC on that page see the freshly-set cookie.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/dtrs");
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setFormError(body?.message ?? shellDictionary.errors.generic);
    } catch {
      setFormError(shellDictionary.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">{authDictionary.login.emailLabel}</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldErrors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">
          {authDictionary.login.passwordLabel}
        </Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {fieldErrors.password ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      {formError ? (
        <StatusPanel variant="error">{formError}</StatusPanel>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? (
          <span
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
        ) : null}
        {authDictionary.login.submit}
      </Button>
    </form>
  );
}
