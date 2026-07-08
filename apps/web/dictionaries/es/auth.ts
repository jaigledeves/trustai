/**
 * Spanish strings for register/verify-email/login (web-auth-flow). Copy
 * here is grounded directly in spec #257's scenarios — do not paraphrase
 * the 401/403/409 messages, they are asserted verbatim by tests.
 */
export const authDictionary = {
  register: {
    title: "Creá tu cuenta",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    submit: "Registrarme",
    successTitle: "¡Ya casi está!",
    successMessage:
      "Revisá tu email para verificar tu cuenta antes de iniciar sesión.",
    errorDuplicateEmail: "Este email ya está registrado.",
    errorInvalidEmail: "Ingresá un email válido.",
    errorPasswordPolicy:
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
  },
  verifyEmail: {
    successTitle: "Cuenta verificada",
    successMessage: "Tu email quedó verificado. Ya podés iniciar sesión.",
    successCta: "Ir a iniciar sesión",
    errorTitle: "Enlace inválido",
    errorMessage: "El enlace es inválido o venció. Registrate de nuevo para recibir uno nuevo.",
  },
  login: {
    title: "Iniciá sesión",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    submit: "Ingresar",
    errorInvalidCredentials: "Email o contraseña incorrectos.",
    errorUnverifiedEmail: "Verificá tu email antes de iniciar sesión.",
    errorInvalidEmail: "Ingresá un email válido.",
    errorPasswordRequired: "Ingresá tu contraseña.",
  },
} as const;
