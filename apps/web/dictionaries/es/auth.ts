/**
 * Spanish strings for register/verify-email/login (web-auth-flow). Copy
 * here is grounded directly in spec #257's scenarios — do not paraphrase
 * the 401/403/409 messages, they are asserted verbatim by tests.
 */
export const authDictionary = {
  register: {
    title: "Crea tu cuenta",
    subtitle: "Empieza a certificar tus documentos con IA y blockchain.",
    loginPrompt: "¿Ya tienes una cuenta?",
    loginCta: "Iniciar sesión",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    submit: "Registrarme",
    successTitle: "¡Ya casi está!",
    successMessage:
      "Revisa tu email para verificar tu cuenta antes de iniciar sesión.",
    errorDuplicateEmail: "Este email ya está registrado.",
    errorInvalidEmail: "Ingresa un email válido.",
    errorPasswordPolicy:
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
  },
  verifyEmail: {
    successTitle: "Cuenta verificada",
    successMessage: "Tu email quedó verificado. Ya puedes iniciar sesión.",
    successCta: "Ir a iniciar sesión",
    errorTitle: "Enlace inválido",
    errorMessage: "El enlace es inválido o venció. Regístrate de nuevo para recibir uno nuevo.",
  },
  login: {
    title: "Inicia sesión",
    subtitle: "Accede a tus certificaciones y Digital Trust Records.",
    registerPrompt: "¿No tienes una cuenta?",
    registerCta: "Crear cuenta",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    submit: "Ingresar",
    errorInvalidCredentials: "Email o contraseña incorrectos.",
    errorUnverifiedEmail: "Verifica tu email antes de iniciar sesión.",
    errorInvalidEmail: "Ingresa un email válido.",
    errorPasswordRequired: "Ingresa tu contraseña.",
    forgotPasswordLink: "¿Olvidaste tu contraseña?",
  },
  forgotPassword: {
    title: "Recupera tu contraseña",
    subtitle: "Te enviaremos un enlace para restablecer tu contraseña.",
    emailLabel: "Email",
    submit: "Enviar enlace",
    successTitle: "Revisa tu email",
    successMessage:
      "Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.",
    loginPrompt: "¿Ya recordaste tu contraseña?",
    loginCta: "Iniciar sesión",
    errorInvalidEmail: "Ingresa un email válido.",
  },
  resetPassword: {
    title: "Elige una nueva contraseña",
    subtitle: "Ingresa tu nueva contraseña para continuar.",
    newPasswordLabel: "Nueva contraseña",
    confirmPasswordLabel: "Confirmar contraseña",
    submit: "Cambiar contraseña",
    successTitle: "Contraseña actualizada",
    successMessage:
      "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.",
    successCta: "Iniciar sesión",
    errorTitle: "Enlace inválido",
    errorMessage:
      "El enlace de restablecimiento no es válido. Solicita uno nuevo para continuar.",
    errorCta: "Solicitar un enlace nuevo",
    errorPasswordPolicy:
      "La contraseña debe tener al menos 8 caracteres, con una letra y un número.",
    errorPasswordMismatch: "Las contraseñas no coinciden.",
    errorInvalidToken:
      "El enlace es inválido o venció. Solicita uno nuevo para continuar.",
  },
} as const;
