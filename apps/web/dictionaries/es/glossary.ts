/**
 * Plain-language term/definition glossary (spec: web-plain-language —
 * "Reusable Accessible Quick-Help Affordance", "Plain-Language Framing for
 * Unavoidable Terms"). Single canonical source consumed by `<QuickHelp
 * title={glossaryDictionary.X.title} definition={glossaryDictionary.X.definition}/>`
 * instances across supporting sections. `title` is the "¿Qué es…?" heading
 * shown in the panel and the accessible name of the ⓘ trigger; `definition`
 * is the plain-language body. Included in `dictionaries.test.ts`'s
 * non-empty-string sweep like every other dictionary module (RNF-041).
 */
export const glossaryDictionary = {
  blockchain: {
    title: "¿Qué es una blockchain?",
    definition:
      "Un registro público y compartido donde la información, una vez escrita, no se puede alterar ni borrar. Nadie es su dueño, así que cualquiera puede consultarlo.",
  },
  huella: {
    title: "¿Qué es la huella?",
    definition:
      "Un código único que se calcula a partir de tu documento, como una huella digital. Si cambia una sola letra, la huella cambia por completo. No permite reconstruir el documento.",
  },
  anclar: {
    title: "¿Qué significa anclar?",
    definition:
      "Se guarda la huella digital de tu documento en la blockchain, junto con la fecha. Así cualquiera puede comprobar más tarde que el documento no fue modificado. El contenido del documento no se guarda en la blockchain.",
  },
  redDePrueba: {
    title: "¿Qué es una red de prueba?",
    definition:
      "Durante el piloto usamos una red de prueba gratuita (Base Sepolia). Funciona igual que la red definitiva, pero sin costos. Al pasar a producción, el mismo mecanismo se usa en la red principal.",
  },
} as const;
