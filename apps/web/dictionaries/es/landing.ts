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
    // In-page anchor labels. Hrefs (#como-funciona, #verificacion, #casos,
    // #faq) are structural and live in `Nav.tsx` (same pattern as the
    // hardcoded /login, /register hrefs); only the labels are dictionary copy.
    sectionLinks: {
      howItWorks: "Cómo funciona",
      verification: "Verificación",
      useCases: "Casos de uso",
      faq: "Preguntas",
    },
  },
  hero: {
    eyebrow:
      "Hoy, probar que un documento no fue alterado depende de que crean en tu palabra.",
    badge: "Integridad verificable por cualquiera · Gratis durante el piloto",
    title: "Nadie tiene que creerte. Pueden comprobarlo.",
    subtitle:
      "Ancrux certifica tus documentos para que cualquiera confirme, por su cuenta, que no fueron alterados. Sin depender de tu palabra ni de la nuestra.",
    primaryCta: "Certificar mi primer documento",
    secondaryCta: "Ver una verificación",
    valueProps: [
      "Sin instalar nada",
      "Verificación pública y gratuita",
      "Tu archivo nunca se publica",
    ] as [string, string, string],
    card: {
      label: "Registro Digital de Confianza (DTR)",
      statusBadge: "Anclado en blockchain",
      fileName: "contrato-servicios-2026.pdf",
      fileMeta: "Contrato · Español · 3 páginas",
      hashLabel: "Huella del registro",
      hashValue: "9f2c…a17b",
      networkLabel: "Red",
      network: "Blockchain pública",
      txLabel: "Transacción",
      txValue: "0x…607C22",
      footerNote: "Verificado · Anclaje confirmado en la blockchain.",
    },
  },
  how: {
    title: "Del archivo a la evidencia, en cuatro pasos",
    subtitle: "Simple para ti. Cualquier modificación posterior, detectable por cualquiera.",
    steps: [
      {
        title: "Subes tu documento",
        description:
          "Se guarda cifrado y protegido. Nunca se publica ni sale de tu control.",
      },
      {
        title: "La IA lo entiende",
        description:
          "Un resumen, el tipo de documento y su idioma, generados automáticamente.",
      },
      {
        title: "Se genera el DTR",
        description:
          "Se crea tu Registro Digital de Confianza (DTR): una huella única e irrepetible de tu documento.",
      },
      {
        title: "Se ancla en blockchain",
        description:
          "Esa huella queda anclada en un bloque con fecha de una blockchain pública. Cualquier modificación posterior del documento es detectable criptográficamente.",
      },
    ],
    technicalDetailLabel: "Ver el detalle técnico",
    technicalDetail: {
      intro:
        "Cada certificación produce un DTR: un registro estructurado y versionado (esquema dtr-2).",
      items: [
        {
          term: "Cifrado en reposo",
          desc: "el archivo se cifra con AES-256-GCM antes de tocar el almacenamiento. Su contenido nunca se publica.",
        },
        {
          term: "Qué contiene el DTR",
          desc: "el SHA-256 del documento, sus metadatos (tipo, tamaño, nombre), el análisis de la IA (resumen, clasificación, idioma) y la procedencia (modelo, versión, fecha) — nunca el documento en sí.",
        },
        {
          term: "Serialización canónica (RFC 8785)",
          desc: "el DTR se serializa de forma determinista y reproducible byte a byte, con implementación propia y sin dependencias.",
        },
        {
          term: "Hash SHA-256",
          desc: "se calcula sobre esa serialización canónica: uno para el núcleo (los datos del documento) y otro para el enriquecimiento (análisis y procedencia), que se combinan en el hash que se ancla.",
        },
        {
          term: "Anclaje on-chain",
          desc: "ese hash se escribe como bytes32 en el contrato AnchorRegistry (permissionless, inmutable, sin owner) en Base Sepolia. El timestamp del bloque prueba que el registro existía, como muy tarde, en esa fecha; no es un sello de tiempo cualificado.",
        },
        {
          term: "Verificable de forma independiente",
          desc: "dtr-core es una librería abierta (MIT), sin framework. En un registro reciente (dtr-2), cualquiera puede recalcular los hashes en su navegador o con la herramienta de línea de comandos ancrux-verify y consultar el anclaje directamente en el contrato, sin confiar en nosotros.",
        },
      ],
      contractLinkLabel: "Ver contrato en Basescan",
      contractLabel: "AnchorRegistry · Base Sepolia",
    },
  },
  verificationDemo: {
    badge: "No hace falta confiar. Se comprueba.",
    title: "Cualquiera puede comprobarlo en segundos.",
    description:
      "Compartes un enlace. Quien lo recibe sube el archivo y Ancrux responde con un veredicto claro sobre su integridad y su anclaje en la blockchain. En los registros recientes, también puede comprobarlo por su cuenta, sin depender de Ancrux.",
    verdictGroupLabel: "Selecciona un veredicto de ejemplo",
    recompute: {
      statement:
        "Además, tu propio navegador recalcula la huella (SHA-256) del archivo de forma independiente del servidor.",
      caveat:
        "Esto demuestra el cálculo independiente de la huella del archivo — no reconstruye ni verifica la huella canónica anclada en la blockchain. En los registros recientes, la verificación independiente sí comprueba ese anclaje.",
    },
  },
  useCases: {
    title: "Para cada documento cuya integridad importa",
    subtitle:
      "Si necesitas demostrar que un archivo no cambió desde que lo registraste, Ancrux lo vuelve comprobable.",
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
          "Deja constancia de que un archivo existía tal cual, como muy tarde, en la fecha del bloque en que se ancló.",
      },
      {
        title: "Evidencia legal y auditorías",
        description:
          "Ancla la huella de informes y pruebas para que cualquier manipulación posterior sea detectable.",
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
          "El veredicto se apoya en una huella anclada en una blockchain pública y en un estándar abierto que cualquiera puede revisar. En los registros recientes no tienes que confiar en Ancrux: tu navegador recalcula las huellas y consulta el contrato directamente, y también hay una herramienta de línea de comandos.",
      },
      {
        title: "Cualquier cambio es detectable",
        description:
          "Si cambia una sola letra, su huella cambia y la verificación falla al instante. Cualquier modificación posterior es detectable criptográficamente.",
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
    subtitle: "Todo lo que necesitas saber antes de confiar en Ancrux.",
    items: [
      {
        question: "¿Se publica mi documento en la blockchain?",
        answer:
          "No. Solo queda la huella del DTR (un código único que representa al registro, calculado a partir de él, sin revelar su contenido). Tu documento se almacena cifrado y nunca se hace público.",
      },
      {
        question: "¿Qué pasa si alguien modifica el archivo?",
        answer:
          "Al verificar, Ancrux detecta que ya no corresponde al registro certificado y devuelve el veredicto 'No coincide'. Cualquier manipulación queda en evidencia.",
      },
      {
        question: "¿Necesito saber de blockchain para usarlo?",
        answer:
          "No. Subes tu documento y Ancrux se encarga del resto. Verificar es tan simple como abrir un enlace.",
      },
      {
        question: "¿Tiene validez legal?",
        answer:
          "Ancrux aporta evidencia técnica de integridad y de que el documento existía, como muy tarde, en la fecha del bloque en que se ancló. No es una firma electrónica ni un sello de tiempo cualificados según eIDAS. Su peso legal depende de la jurisdicción y del caso; es un respaldo, no un reemplazo del asesoramiento legal.",
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
    copyright: "© 2026 Ancrux",
  },
} as const;
