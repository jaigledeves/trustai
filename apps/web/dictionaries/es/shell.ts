/**
 * Spanish strings for the app shell: nav, dashboard layout, generic
 * session/error copy shared across routes. RNF-041: every user-facing
 * string in the app must come from a dictionary module like this one, never
 * an inline JSX literal.
 */
export const shellDictionary = {
  appName: "TrustAI",
  nav: {
    dtrs: "Mis DTR",
    newCertification: "Certificar documento",
    logout: "Cerrar sesión",
  },
  session: {
    expired: "Tu sesión expiró, iniciá sesión de nuevo.",
  },
  errors: {
    generic: "Ocurrió un error inesperado. Probá de nuevo en unos minutos.",
    notFound: "No encontramos lo que buscabas.",
  },
} as const;
