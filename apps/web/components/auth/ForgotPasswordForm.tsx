"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authDictionary } from "../../dictionaries/es/auth";
import { shellDictionary } from "../../dictionaries/es/shell";
import { mapApiError } from "../../lib/api/errors";
import {
  validateForgotPasswordForm,
  type ForgotPasswordFormErrors,
} from "../../lib/validation/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { StatusPanel } from "../ui/status-panel";

/**
 * Forgot-password form (spec: auth-password-recovery "Forgot-Password
 * Enumeration Defense"). Always shows the same success panel once the
 * request completes, regardless of whether the email is registered — the
 * backend enforces this by always returning `200 { ok: true }`, so the
 * client has nothing enumeration-unsafe to branch on.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateForgotPasswordForm(email);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/backend/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSucceeded(true);
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { status?: number }
        | null;
      setFormError(
        mapApiError(body?.status ?? response.status, "forgotPassword"),
      );
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
        title={authDictionary.forgotPassword.successTitle}
        action={
          <Button size="lg" asChild>
            <Link href="/login">{authDictionary.forgotPassword.loginCta}</Link>
          </Button>
        }
      >
        {authDictionary.forgotPassword.successMessage}
      </StatusPanel>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-password-email">
          {authDictionary.forgotPassword.emailLabel}
        </Label>
        <Input
          id="forgot-password-email"
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
        {authDictionary.forgotPassword.submit}
      </Button>
    </form>
  );
}
