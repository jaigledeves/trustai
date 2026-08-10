/**
 * Plain-language term/definition glossary (spec: web-plain-language —
 * "Reusable Accessible Quick-Help Affordance", "Plain-Language Framing for
 * Unavoidable Terms"). Single canonical source consumed by `<QuickHelp
 * term={glossaryDictionary.X.term} definition={glossaryDictionary.X.definition}/>`
 * instances across supporting sections. Included in `dictionaries.test.ts`'s
 * non-empty-string sweep like every other dictionary module (RNF-041).
 */
export const glossaryDictionary = {
  blockchain: {
    term: "blockchain",
    definition:
      "Un registro público y compartido donde la información, una vez escrita, no se puede alterar ni borrar. Nadie es su dueño, así que cualquiera puede consultarlo.",
  },
  huella: {
    term: "huella",
    definition:
      "Un código único que se calcula a partir de tu documento, como una huella digital. Si cambia una sola letra, la huella cambia por completo.",
  },
  anclar: {
    term: "anclar",
    definition:
      "Guardar la huella de tu documento en la blockchain, de forma permanente y con fecha, para que cualquiera pueda comprobar después que no cambió.",
  },
  redDePrueba: {
    term: "red de prueba",
    definition:
      "Durante el piloto usamos una red de prueba gratuita (Base Sepolia). El mecanismo es idéntico al de la red definitiva, pero sin costos.",
  },
} as const;
