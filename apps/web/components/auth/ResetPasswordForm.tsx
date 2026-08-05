"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authDictionary } from "../../dictionaries/es/auth";
import { shellDictionary } from "../../dictionaries/es/shell";
import { mapApiError } from "../../lib/api/errors";
import {
  validateResetPasswordForm,
  type ResetPasswordFormErrors,
} from "../../lib/validation/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { StatusPanel } from "../ui/status-panel";

interface ResetPasswordFormProps {
  token: string;
}

/** A stored hash mismatch or expiry both surface as 400 (spec: "Password Reset Token Single-Use and Expiry"). */
const INVALID_TOKEN_STATUS = 400;

/**
 * Reset-password form (spec: auth-password-recovery "Reset Form Confirms
 * Password Match", "Invalid or Expired Token Web Handling"). An
 * invalid/expired token (API 400) is a terminal error state — not an
 * inline retry — because the same token will never succeed again; the
 * only path forward is requesting a new one from `/forgot-password`.
 */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(
    null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateResetPasswordForm(newPassword, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/backend/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.ok) {
        setSucceeded(true);
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { status?: number }
        | null;
      const status = body?.status ?? response.status;
      if (status === INVALID_TOKEN_STATUS) {
        setTokenErrorMessage(mapApiError(status, "resetPassword"));
        return;
      }
      setFormError(mapApiError(status, "resetPassword"));
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
        title={authDictionary.resetPassword.successTitle}
        action={
          <Button size="lg" asChild>
            <Link href="/login">{authDictionary.resetPassword.successCta}</Link>
          </Button>
        }
      >
        {authDictionary.resetPassword.successMessage}
      </StatusPanel>
    );
  }

  if (tokenErrorMessage) {
    return (
      <StatusPanel
        variant="error"
        title={authDictionary.resetPassword.errorTitle}
        action={
          <Button size="lg" variant="outline" asChild>
            <Link href="/forgot-password">
              {authDictionary.resetPassword.errorCta}
            </Link>
          </Button>
        }
      >
        {tokenErrorMessage}
      </StatusPanel>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password-new">
          {authDictionary.resetPassword.newPasswordLabel}
        </Label>
        <Input
          id="reset-password-new"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {fieldErrors.newPassword ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.newPassword}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password-confirm">
          {authDictionary.resetPassword.confirmPasswordLabel}
        </Label>
        <Input
          id="reset-password-confirm"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {fieldErrors.confirmPassword ? (
          <p role="alert" className="text-sm text-destructive">
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
        {authDictionary.resetPassword.submit}
      </Button>
    </form>
  );
}
