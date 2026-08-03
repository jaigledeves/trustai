/**
 * Spanish strings for the public landing page (route "/"). Neutral Latin
 * American Spanish — no voseo. Per RNF-041, every user-facing string comes
 * from a dictionary module like this one, never an inline JSX literal.
 *
 * Content is audited (spec: public-landing — Central Artifact Terminology
 * Lock, Accurate Anchoring Copy, Content-Audit Accuracy, Honest
 * Verification Demo) by `dictionaries.test.ts`'s "landingDictionary copy
 * audit" describe block: what gets anchored on-chain is the SHA-256 hash
 * of the DTR's RFC 8785 canonical serialization, never "the file's hash";
 * use cases claim only unmodified-since-timestamp integrity, never
 * authorship/ownership/issuer legitimacy; the FAQ never promises pricing.
 *
 * Note (deviation from design.md's literal key list): `hero` collapses
 * the previous `secondaryCta`/`demoCta` pair into a single `secondaryCta`
 * key, since this redesign's Hero renders exactly two CTAs — `/register`
 * and the guarded `/verify/${config.demoDtrId}` link (tasks.md 3.2) — and
 * the finalized copy defines exactly two Hero CTAs. Keeping both old keys
 * would leave one permanently unused/orphaned.
 */
export const landingDictionary = {
  nav: {
    login: "Iniciar sesión",
    register: "Crear cuenta",
  },
  hero: {
    badge: "Piloto en vivo · Base Sepolia (testnet)",
    title: "Demuestra que tus documentos son auténticos.",
    subtitle:
      "TrustAI analiza cada archivo con inteligencia artificial y genera su Registro Digital de Confianza (DTR): una huella criptográfica registrada en blockchain. Cualquier persona puede comprobar que el documento no fue alterado, sin tener que confiar en ti ni en nosotros.",
    primaryCta: "Certificar mi primer documento",
    secondaryCta: "Ver una verificación",
    valueProps: [
      "Sin instalar nada",
      "Verificación pública y gratuita",
      "Tu archivo nunca se publica",
    ] as [string, string, string],
    card: {
      label: "Registro Digital de Confianza (DTR)",
      statusBadge: "Registrado en blockchain",
      fileName: "contrato-servicios-2026.pdf",
      fileMeta: "Contrato · Español · 3 páginas",
      hashLabel: "Huella del DTR · SHA-256",
      hashValue: "9f2c…a17b",
      networkLabel: "Red",
      network: "Base Sepolia",
      txLabel: "Transacción",
      txValue: "0x…607C22",
      footerNote: "Verificado · Anclaje confirmado en la blockchain.",
    },
  },
  how: {
    title: "Del archivo a la evidencia, en cuatro pasos",
    subtitle: "Simple para ti. Imposible de falsificar para cualquiera.",
    steps: [
      {
        title: "Subes tu documento",
        description:
          "Se almacena cifrado (AES-256-GCM). Nunca se publica ni sale de tu control.",
      },
      {
        title: "La IA lo entiende",
        description:
          "Un resumen, el tipo de documento y su idioma, generados automáticamente.",
      },
      {
        title: "Se genera el DTR",
        description:
          "Se crea tu Registro Digital de Confianza y se calcula el hash SHA-256 de su serialización canónica.",
      },
      {
        title: "Se ancla en blockchain",
        description:
          "Ese hash queda registrado de forma permanente e inalterable en Base Sepolia.",
      },
    ],
  },
  verificationDemo: {
    badge: "No hace falta confiar. Se comprueba.",
    title: "Nadie tiene que creerte. Pueden comprobarlo.",
    description:
      "Compartes un enlace. Quien lo recibe sube el archivo y TrustAI responde con un veredicto claro sobre su integridad y su anclaje en la blockchain.",
    verdictGroupLabel: "Selecciona un veredicto de ejemplo",
    recompute: {
      statement:
        "Además, tu propio navegador recalcula el hash SHA-256 del archivo de forma independiente del servidor.",
      caveat:
        "Esto demuestra el cálculo independiente del hash del archivo — no reconstruye ni verifica el hash canónico anclado en la blockchain.",
    },
  },
  useCases: {
    title: "Para cada documento cuya integridad importa",
    subtitle:
      "Si necesitas demostrar que un archivo no cambió desde que lo registraste, TrustAI lo vuelve comprobable.",
    items: [
      {
        title: "Contratos y acuerdos",
        description:
          "Demuestra que la versión que compartes es idéntica a la registrada, sin cambios posteriores.",
      },
      {
        title: "Títulos y certificados",
        description:
          "Permite confirmar que el documento recibido es exactamente el que se registró.",
      },
      {
        title: "Facturas y comprobantes",
        description:
          "Respalda documentos financieros con evidencia de que su contenido no fue modificado.",
      },
      {
        title: "Obra creativa y documentación",
        description:
          "Deja constancia con fecha de que un archivo existía tal cual en el momento de registrarlo.",
      },
      {
        title: "Evidencia legal y auditorías",
        description:
          "Sella informes y pruebas para demostrar que no fueron manipulados después.",
      },
      {
        title: "Informes y entregables",
        description:
          "Comparte reportes que el receptor puede verificar de forma independiente.",
      },
    ],
  },
  pillars: {
    title: "Por qué puedes confiar",
    items: [
      {
        title: "Verificación independiente",
        description:
          "El veredicto se apoya en un hash anclado en una blockchain pública y en la especificación abierta de dtr-core. La confianza no recae en TrustAI.",
      },
      {
        title: "Integridad criptográfica",
        description:
          "Si cambia un solo byte, su hash cambia y la verificación falla. No hay forma de falsificarlo.",
      },
      {
        title: "Inteligencia real",
        description:
          "Cada certificación incluye una comprensión estructurada del contenido —resumen, tipo e idioma—, no solo una huella.",
      },
    ],
  },
  faq: {
    title: "Preguntas frecuentes",
    subtitle: "Todo lo que necesitas saber antes de confiar en TrustAI.",
    items: [
      {
        question: "¿Se publica mi documento en la blockchain?",
        answer:
          "No. Solo queda el hash del DTR (una huella SHA-256 que representa al registro sin revelar su contenido). Tu documento se almacena cifrado y nunca se hace público.",
      },
      {
        question: "¿Qué pasa si alguien modifica el archivo?",
        answer:
          "Al verificar, TrustAI detecta que ya no corresponde al registro certificado y devuelve el veredicto 'No coincide'. Cualquier manipulación queda en evidencia.",
      },
      {
        question: "¿Necesito saber de blockchain para usarlo?",
        answer:
          "No. Subes tu documento y TrustAI se encarga del resto. Verificar es tan simple como abrir un enlace.",
      },
      {
        question: "¿Tiene validez legal?",
        answer:
          "TrustAI aporta evidencia técnica de integridad y de la fecha de registro. Su peso legal depende de la jurisdicción y del caso; es un respaldo, no un reemplazo del asesoramiento legal.",
      },
      {
        question: "¿Por qué usan Base Sepolia?",
        answer:
          "Estamos en fase piloto sobre la testnet Base Sepolia para validar el producto sin costos de red. El mismo mecanismo se traslada a la red principal para producción.",
      },
      {
        question: "¿Tiene costo?",
        answer: "Durante el piloto puedes certificar y verificar documentos sin costo.",
      },
    ],
  },
  cta: {
    title: "Certifica tu primer documento hoy",
    subtitle:
      "Crea una cuenta y obtén tu primer Registro Digital de Confianza (DTR) verificable en minutos. Gratis durante el piloto.",
    button: "Empezar ahora",
  },
  footer: {
    tagline: "Certificación inteligente de activos digitales.",
    contractLabel: "Contrato AnchorRegistry en Base Sepolia",
    copyright: "© 2026 TrustAI",
  },
} as const;
