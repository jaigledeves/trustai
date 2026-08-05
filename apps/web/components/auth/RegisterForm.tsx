"use client";

import Link from "next/link";
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
import { StatusPanel } from "../ui/status-panel";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateRegisterForm(email, password, confirmPassword);
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
      <StatusPanel
        variant="success"
        title={authDictionary.register.successTitle}
        action={
          <Button size="lg" asChild>
            <Link href="/login">{authDictionary.register.loginCta}</Link>
          </Button>
        }
      >
        {authDictionary.register.successMessage}
      </StatusPanel>
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
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={
            fieldErrors.password
              ? "register-password-error"
              : "register-password-hint"
          }
        />
        <p id="register-password-hint" className="text-sm text-muted-foreground">
          {authDictionary.register.passwordHint}
        </p>
        {fieldErrors.password ? (
          <p id="register-password-error" role="alert" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-confirm-password">
          {authDictionary.register.confirmPasswordLabel}
        </Label>
        <Input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={
            fieldErrors.confirmPassword
              ? "register-confirm-password-error"
              : undefined
          }
        />
        {fieldErrors.confirmPassword ? (
          <p id="register-confirm-password-error" role="alert" className="text-sm text-destructive">
            {fieldErrors.confirmPassword}
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
        {authDictionary.register.submit}
      </Button>
    </form>
  );
}
