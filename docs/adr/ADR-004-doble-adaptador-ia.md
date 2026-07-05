# ADR-004: Doble adaptador IA desde el día uno (OpenAI + Mistral)

**Estado:** Aceptada (enmendada, ver abajo)
**Fecha:** 05/07/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)

> **Enmienda (05/07/2026, 11-MVP-Definition):** el MVP entrega UN
> adaptador real (proveedor por coste/simplicidad) + un adaptador
> stub/local para desarrollo, tests y contingencia de demo. El stub
> valida la abstracción del puerto igual que lo haría un segundo
> proveedor. El segundo adaptador real (Mistral, UE/RGPD) entra
> pre-lanzamiento comercial, cuando el argumento de residencia tenga
> clientes delante. La decisión de fondo (dos implementaciones reales
> del puerto antes de vender el argumento RGPD) no cambia.

## Contexto

- RNF-030 exige proveedor de IA intercambiable tras un puerto.
- RNF-010/012 (RGPD) exigen control sobre dónde se procesa el contenido:
  los despachos manejan documentación sensible.
- 04-Viability detectó que OpenAI cobra +10% por residencia de datos en
  la UE; Mistral es proveedor UE nativo.
- Riesgo clásico: la "abstracción" con un solo adaptador degenera en un
  acoplamiento encubierto (la interfaz calca la API del único
  proveedor).

## Decisión

El puerto `AiAnalysisPort` se implementa con **dos adaptadores reales
desde el MVP**:

- **OpenAI** (clase mini, p. ej. gpt-5.4-mini): referencia de
  calidad/coste del 04.
- **Mistral** (UE): opción de residencia europea para el argumento
  comercial RGPD.

Contrato del puerto (conceptual):

```typescript
interface AiAnalysisPort {
  analyze(input: {
    text: string;
    mimeType: string;
  }): Promise<{
    summary: string;
    classification: DocumentClass;
    entities: Entity[];
    provenance: { provider: string; model: string; modelVersion: string };
  }>;
}
```

Reglas:

- Salida SIEMPRE estructurada (JSON schema / structured outputs) y
  validada con Zod antes de entrar al dominio.
- El `provenance` es obligatorio y se congela en el DTR (RF-025,
  INV-26).
- La selección de proveedor es configuración por entorno (MVP); por
  organización como evolución (feature premium RGPD).

## Alternativas consideradas

### A. Un solo proveedor (OpenAI) con "abstracción para el futuro"

- Pros: menos trabajo inicial.
- Contras: la abstracción no probada se pudre; el argumento RGPD queda
  en promesa; migrar después cuesta el doble.
- **Descartada.**

### B. Router/agregador de LLMs (OpenRouter u otro intermediario)

- Pros: muchos modelos con una integración.
- Contras: añade un tercero al flujo de datos sensibles — exactamente
  lo que el segmento no tolera; DPA más difuso.
- **Descartada** para contenido de clientes.

### C. Dos adaptadores propios (elegida)

- Pros: abstracción validada con dos implementaciones reales; argumento
  comercial RGPD tangible; resiliencia ante cambios de precios (04
  §sensibilidad).
- Contras: doble suite de tests de integración y prompts ajustados por
  proveedor. Aceptable: el contrato de salida es idéntico.

## Consecuencias

1. Los prompts viven versionados junto a cada adaptador; los tests de
   contrato validan que ambos producen salida conforme al schema.
2. Cambiar de proveedor (o añadir uno) = nuevo adaptador + config; el
   dominio no se entera.
3. El coste de análisis puede variar por proveedor: el 04 acota el
   rango (€0.002-0.03/DTR) y ambos caen dentro.

## Referencias

- docs/06-Requirements.md (RNF-030, RNF-010/012, RF-025)
- docs/04-Viability.md (§1.1, §sensibilidad)
- docs/08-Architecture.md (puertos y adaptadores)
