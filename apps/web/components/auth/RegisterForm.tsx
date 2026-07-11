"use client";

import { useState, type FormEvent } from "react";
import { authDictionary } from "../../dictionaries/es/auth";
import { shellDictionary } from "../../dictionaries/es/shell";
import { mapApiError } from "../../lib/api/errors";
import {
  validateRegisterForm,
  type RegisterFormErrors,
} from "../../lib/validation/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

/**
 * Register form (spec: web-auth-flow "Registration"). Submits through the
 * generic Bearer-injecting proxy (no token to inject pre-login, so the
 * proxy simply forwards without an Authorization header) rather than a
 * dedicated route handler — register never sets a cookie (no auto-login),
 * so there is nothing session-specific for a bespoke handler to do.
 */
export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateRegisterForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/backend/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        setSucceeded(true);
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { status?: number }
        | null;
      setFormError(mapApiError(body?.status ?? response.status, "register"));
    } catch {
      setFormError(shellDictionary.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  if (succeeded) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-lg border border-border bg-accent/50 p-4 text-center"
      >
        <h1 className="text-lg font-semibold">
          {authDictionary.register.successTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {authDictionary.register.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">{authDictionary.register.emailLabel}</Label>
        <Input
          id="register-email"
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
        <Label htmlFor="register-password">
          {authDictionary.register.passwordLabel}
        </Label>
        <Input
          id="register-password"
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
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {authDictionary.register.submit}
      </Button>
    </form>
  );
}
