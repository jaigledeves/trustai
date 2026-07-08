import { authDictionary } from "../../dictionaries/es/auth";

// Mirrors RegisterDto's backend regex exactly (apps/api/src/modules/auth/dto/register.dto.ts)
// so a form the client accepts is never rejected server-side for a policy mismatch.
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_SHAPE.test(email);
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
}

/** Client-side pre-validation before any network call (spec: "Client-side validation error"). */
export function validateRegisterForm(
  email: string,
  password: string,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!isValidEmail(email)) {
    errors.email = authDictionary.register.errorInvalidEmail;
  }
  if (!PASSWORD_POLICY.test(password)) {
    errors.password = authDictionary.register.errorPasswordPolicy;
  }

  return errors;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

/** Login has no password complexity rule client-side — only presence (the API owns correctness). */
export function validateLoginForm(
  email: string,
  password: string,
): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!isValidEmail(email)) {
    errors.email = authDictionary.login.errorInvalidEmail;
  }
  if (password.length === 0) {
    errors.password = authDictionary.login.errorPasswordRequired;
  }

  return errors;
}
