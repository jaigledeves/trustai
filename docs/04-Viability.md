# 04 - Viability Study

**Proyecto:** Ancrux
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Cuantificar con precios reales (julio 2026) el coste de construir y
operar Ancrux, calcular el coste unitario por DTR, contrastarlo con el
pricing del Business Model (03) y determinar el punto de equilibrio.

## Alcance

- Coste variable por DTR (IA + blockchain + almacenamiento).
- Costes fijos mensuales en dos escenarios (MVP académico y producción).
- Unit economics y punto de equilibrio.
- Análisis de sensibilidad y riesgos económicos.

Fuera de alcance: coste de adquisición de clientes (CAC), salarios y
proyecciones plurianuales. El tiempo del fundador no se imputa (contexto
TFM).

## Contexto

El Business Model (03) fijó un umbral: el coste variable por DTR debe
mantenerse **por debajo de ~€0.20** para sostener margen bruto ≥80% en
el plan Profesional (€19/mes, 25 DTRs). Este documento verifica ese
umbral con precios de mercado actuales.

Tipo de cambio de referencia: 1 USD ≈ 0.93 EUR (aproximación julio
2026; los precios cloud/IA se facturan mayoritariamente en USD).

## 1. Coste variable por DTR

### 1.1 Análisis IA

Supuesto de trabajo: documento medio de ~10 páginas ≈ 7,000 tokens de
entrada (contenido + prompt) y ~800 tokens de salida (resumen +
clasificación + entidades en JSON estructurado).

Precios API por millón de tokens (fuentes: OpenAI y Anthropic, julio
2026):

| Modelo | Input $/M | Output $/M | Coste por documento |
|---|---|---|---|
| gpt-5.4-nano | $0.20 | $1.25 | ~$0.0024 |
| gpt-5.4-mini | $0.75 | $4.50 | ~$0.009 |
| Claude Haiku 4.5 | $1.00 | $5.00 | ~$0.011 |
| gpt-5.4 (gama alta) | $2.50 | $15.00 | ~$0.03 |

Notas:

- El procesamiento batch (ambos proveedores) reduce estos costes un
  50% — aplicable si el análisis no necesita ser síncrono.
- OCR de imágenes: resoluble con modelos multimodales de gama baja o
  Tesseract (open source, coste cero); impacto menor.
- **Gotcha RGPD**: OpenAI cobra un 10% de recargo por residencia de
  datos regional (UE). Alternativa a evaluar en arquitectura:
  proveedores nativos europeos (p. ej. Mistral) para el requisito de
  residencia UE del segmento despachos.

**Conclusión IA**: entre **€0.002 y €0.03 por DTR** según modelo. Incluso
con el modelo de gama alta queda un orden de magnitud por debajo del
umbral.

### 1.2 Anclaje blockchain

Coste de una transacción simple en L2s de Ethereum (fuente:
l2fees.info, julio 2026): entre **$0.04 y $0.19** (Optimism/Arbitrum
~$0.09; Ethereum L1 ~$1.10 — descartado para operar).

Estrategias por fase:

| Fase | Estrategia | Coste por DTR |
|---|---|---|
| MVP académico | Testnet (Sepolia/Amoy) | €0 |
| Producción v1 | Anclaje individual en L2 | ~€0.04–0.18 |
| Producción optimizada | **Batching con Merkle root**: anclar N DTRs en 1 tx (p. ej. cada 10 min) | ~€0.001–0.01 amortizado |

El batching con Merkle root es la palanca clave: el coste de gas por
DTR tiende a cero al crecer el volumen, manteniendo verificabilidad
individual (Merkle proof incluida en cada DTR). Es exactamente el
modelo operativo de OriginStamp y OpenTimestamps. Decisión formal en la
fase de arquitectura (candidata a ADR).

### 1.3 Almacenamiento y proceso

- Activo cifrado medio ~5 MB; object storage ~€0.005–0.015/GB·mes →
  **~€0.0001/documento·mes**. Despreciable.
- Cómputo del pipeline (hashing, canonicalización): despreciable frente
  a los anteriores.
- Pasarela de pago (Stripe, ~1.5% + €0.25/cobro): se aplica por
  suscripción, no por DTR; ~€0.55/mes por usuario Profesional.

### 1.4 Total coste variable por DTR

| Escenario | IA | Gas | Storage | **Total** |
|---|---|---|---|---|
| MVP (testnet + mini) | €0.008 | €0 | ~€0 | **~€0.01** |
| Producción v1 (L2 individual + mini) | €0.008 | €0.09 | ~€0 | **~€0.10** |
| Producción optimizada (batching + mini) | €0.008 | €0.005 | ~€0 | **~€0.015** |
| Peor caso (modelo alto + L2 caro individual) | €0.03 | €0.18 | ~€0 | **~€0.21** |

**Veredicto contra el umbral del 03 (€0.20)**: se cumple con margen en
todos los escenarios operativos razonables. Solo el peor caso
(modelo premium + anclaje individual en la L2 más cara) lo roza — y es
un escenario evitable por diseño (batching).

## 2. Costes fijos mensuales

Estimaciones con proveedores europeos (Hetzner, RGPD-compliant,
Alemania/Finlandia) — a confirmar al cerrar la arquitectura:

| Concepto | MVP académico | Producción v1 |
|---|---|---|
| VPS backend + frontend (Hetzner Cloud) | €6–12 | €25–50 (redundancia) |
| PostgreSQL | incluido en VPS | €15–30 (gestionado/backups) |
| Object storage | €5 | €5–15 |
| Dominio + DNS | €1.5 | €1.5 |
| Email transaccional | €0 (free tier) | €10–15 |
| Monitorización | €0 (free tiers) | €0–20 |
| **Total** | **~€15–20/mes** | **~€60–130/mes** |

El MVP académico completo (con testnet) cuesta **menos de €20/mes +
consumo de API de IA** (decenas de céntimos en pruebas). El proyecto es
económicamente viable como TFM sin financiación.

## 3. Unit economics y punto de equilibrio

Plan Profesional (€19/usuario/mes, 25 DTRs incluidos), escenario
producción optimizada:

```
Ingreso por usuario:              €19.00
Coste variable (25 × €0.015):     -€0.38
Pasarela de pago:                 -€0.55
                                  ─────────
Margen de contribución:           €18.07  (95% margen bruto)
```

Punto de equilibrio sobre costes fijos:

| Escenario fijo | Usuarios de pago necesarios |
|---|---|
| Producción v1 austera (€60/mes) | **4 usuarios** |
| Producción v1 completa (€130/mes) | **8 usuarios** |

DTR adicional a €0.90 con coste ~€0.015 → margen ~98%: cada unidad de
consumo extra es casi íntegramente margen.

**Lectura honesta**: el punto de equilibrio de infraestructura es
trivial (un solo despacho de 5-8 personas lo cubre). El coste real del
negocio no está en la infraestructura sino en la adquisición de
clientes y el tiempo de desarrollo — fuera de alcance de este documento
pero señalado para la fase comercial.

## 4. Análisis de sensibilidad

| Variable | Impacto | Mitigación |
|---|---|---|
| Precio APIs LLM (histórico: a la baja) | Bajo — incluso ×3 el coste IA sigue <€0.03 | Abstracción de proveedor (ya en Constitución); batch API -50% |
| Precio del gas L2 (volátil, ligado a ETH) | Medio en anclaje individual; casi nulo con batching | Batching Merkle; elección de L2 barata |
| Recargo residencia UE (+10% OpenAI) | Bajo | Evaluar Mistral u otro proveedor UE en arquitectura |
| Tipo de cambio USD/EUR | Bajo | Márgenes >90% absorben variaciones |
| Volumen medio de tokens por documento | Medio (documentos muy largos ×5-10 tokens) | Límite de tamaño por plan; chunking + resumen jerárquico |

## Decisiones

1. El MVP académico opera en **testnet** (coste blockchain cero) sin
   comprometer la demostrabilidad.
2. La arquitectura debe diseñar el anclaje como **estrategia
   intercambiable** (individual ↔ batching Merkle) desde el día uno.
3. Modelo IA de referencia para costes: clase "mini" (~€0.01/DTR); los
   modelos de gama alta se reservan para features premium futuras.
4. Proveedores de infraestructura europeos (RGPD) como opción por
   defecto.

## Alternativas consideradas

- **Ethereum L1 para anclaje**: descartado (~$1.10/tx, ×10-100 sobre
  L2s, sin beneficio adicional de seguridad relevante para el caso de
  uso).
- **Anclar también en Bitcoin (modelo OriginStamp)**: pospuesto;
  añadiría redundancia percibida pero duplica complejidad. Revisable
  post-MVP.
- **Self-hosting de LLM open source**: descartado para MVP (coste fijo
  de GPU >> coste variable de API a bajo volumen); revisable a escala.

## Riesgos

- Los precios citados cambian con frecuencia (especialmente IA y gas):
  revisar antes de fijar precios comerciales definitivos.
- l2fees.info puede no reflejar todas las L2 actuales (no lista Base ni
  Polygon PoS): contrastar con los gas trackers de las cadenas
  candidatas en la fase de arquitectura.
- El punto de equilibrio excluye CAC y tiempo de desarrollo: no
  confundir viabilidad de infraestructura con viabilidad de negocio
  completa.

## Referencias

- OpenAI API Pricing — https://platform.openai.com/docs/pricing (consultado 05/07/2026)
- Anthropic API Pricing — https://claude.com/pricing (consultado 05/07/2026)
- L2 Fees — https://l2fees.info (consultado 05/07/2026)
- Hetzner Cloud — https://www.hetzner.com/cloud/ (consultado 05/07/2026)
- docs/03-Business-Model.md (pricing y umbral de margen)
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md

## Checklist

- [x] Coste variable por DTR calculado con precios reales y fuentes
- [x] Umbral de €0.20 del Business Model verificado (se cumple)
- [x] Costes fijos en dos escenarios
- [x] Punto de equilibrio calculado
- [x] Análisis de sensibilidad
- [ ] Confirmar precios exactos de Hetzner al cerrar arquitectura
- [ ] Contrastar gas en Base/Polygon PoS con trackers propios
- [ ] Revisar precios IA antes del lanzamiento comercial

## Próximo Documento

05-Personas-UseCases.md
