/**
 * Spanish strings for the app shell: nav, dashboard layout, generic
 * session/error copy shared across routes. RNF-041: every user-facing
 * string in the app must come from a dictionary module like this one, never
 * an inline JSX literal.
 */
export const shellDictionary = {
  appName: "Ancrux",
  meta: {
    description:
      "Certifica tus documentos y demuestra, con evidencia pública y comprobable, que no fueron alterados.",
  },
  nav: {
    dtrs: "Mis DTR",
    newCertification: "Certificar documento",
    /** Abbreviated label shown beside the icon on constrained nav widths. */
    newCertificationShort: "Certificar",
    logout: "Cerrar sesión",
    /** Single sign-in CTA shared by the public landing `Nav` and the
     * `verify/[id]` header (spec: web-visual-coherence — No Ambiguous Auth
     * Icon in Public Nav; public-landing — Session-Aware Nav Auth
     * Affordance). Always a text label, never an icon-only control. */
    signIn: "Acceder",
  },
  /**
   * Theme toggle copy (spec: web-theme). Shared by the authenticated shell
   * nav and the public landing/verify nav — one copy avoids drift between
   * the two surfaces (design.md decision #4).
   */
  theme: {
    groupLabel: "Tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
  },
  session: {
    expired: "Tu sesión expiró, inicia sesión de nuevo.",
  },
  errors: {
    generic: "Ocurrió un error inesperado. Prueba de nuevo en unos minutos.",
    genericTitle: "Algo salió mal",
    retry: "Reintentar",
    notFound: "No encontramos lo que buscabas.",
  },
} as const;
