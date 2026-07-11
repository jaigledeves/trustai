/**
 * Spanish strings for the public landing page (route "/"). Neutral Latin
 * American Spanish — no voseo. Per RNF-041, every user-facing string comes
 * from a dictionary module like this one, never an inline JSX literal.
 */
export const landingDictionary = {
  nav: {
    login: "Iniciar sesión",
    register: "Crear cuenta",
  },
  hero: {
    badge: "En vivo en Base Sepolia",
    title: "Confianza digital para tus activos",
    subtitle:
      "La IA comprende el contenido, la blockchain certifica su integridad. Cada documento obtiene un Digital Trust Record verificable por cualquiera.",
    primaryCta: "Crear cuenta gratis",
    secondaryCta: "Ver cómo funciona",
  },
  how: {
    title: "Cómo funciona",
    subtitle: "Del documento a la evidencia verificable en cuatro pasos.",
    steps: [
      {
        title: "Subes tu documento",
        description:
          "El archivo se almacena cifrado. Nunca sale de tu control sin tu permiso.",
      },
      {
        title: "La IA lo analiza",
        description:
          "Un resumen, una clasificación y el idioma del contenido, generados automáticamente.",
      },
      {
        title: "Se genera el DTR",
        description:
          "El Digital Trust Record se serializa de forma canónica y se calcula su hash SHA-256.",
      },
      {
        title: "Se ancla on-chain",
        description:
          "El hash queda registrado en Base Sepolia. Inmutable, público y verificable para siempre.",
      },
    ],
  },
  pillars: {
    title: "Por qué es confiable",
    items: [
      {
        title: "Verificación independiente",
        description:
          "Cualquier persona puede recalcular el hash y compararlo con la blockchain, sin necesidad de confiar en TrustAI.",
      },
      {
        title: "Integridad criptográfica",
        description:
          "Si cambia un solo byte del documento, el hash cambia y la verificación falla. No hay forma de falsificarlo.",
      },
      {
        title: "Análisis con IA",
        description:
          "Cada certificación incluye una comprensión estructurada del contenido, no solo una huella digital.",
      },
    ],
  },
  cta: {
    title: "Certifica tu primer documento hoy",
    subtitle:
      "Crea una cuenta y obtén tu primer Digital Trust Record verificable en minutos.",
    button: "Empezar ahora",
  },
  footer: {
    tagline: "Certificación inteligente de activos digitales.",
    contractLabel: "Contrato AnchorRegistry en Base Sepolia",
    copyright: "© 2026 TrustAI",
  },
} as const;
