# 03 - Business Model

**Proyecto:** Ancrux
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Definir el modelo de negocio de Ancrux: a quién vendemos, qué
vendemos, cómo generamos ingresos y con qué estructura de precios,
usando el benchmark de mercado del documento 02. Este documento fusiona
Business Model y Lean Canvas para evitar duplicidad.

## Alcance

- Lean Canvas completo.
- Estrategia de pricing con planes concretos para el segmento cabeza de
  playa.
- Flujos de ingresos del MVP y de la evolución.
- Estructura de costes cualitativa (la cuantificación vive en
  04-Viability).

Fuera de alcance: proyecciones financieras plurianuales y plan de
captación detallado (post-validación de hipótesis H1-H3).

## Contexto

- Segmento cabeza de playa: **despachos profesionales y consultoras**
  en España (decisión en 01-Product-Vision §8).
- Benchmark de precios validado (02-Market-Research): individual
  €9-11/mes, profesional €23-45/usuario/mes, operación premium
  €2.50-15/unidad.
- El anclaje blockchain es una commodity gratuita: el precio se
  justifica por la capa de inteligencia + evidencia integrada (DTR),
  nunca por el timestamping.

## Lean Canvas

### 1. Problema

1. Los despachos y consultoras no pueden demostrar de forma
   independiente la integridad y existencia de sus documentos ante
   clientes, contrapartes o auditores.
2. La revisión y clasificación documental consume horas facturables.
3. Las evidencias actuales (certificados de firma, logs internos)
   dependen de confiar en un proveedor o en la propia organización.

**Alternativas existentes**: firma electrónica (Signaturit, DocuSign),
notarización blockchain sin IA (OriginStamp), procesos manuales.

### 2. Segmento de clientes

- **Cabeza de playa**: despachos profesionales (abogados, asesorías
  fiscales/laborales) y consultoras pequeñas y medianas en España
  (2-50 empleados).
- **Early adopters**: despachos con práctica en litigios, propiedad
  intelectual o compliance, donde la prueba de existencia tiene valor
  directo e inmediato.

### 3. Propuesta de valor única

> Certifica y comprende tus documentos en un solo paso: evidencia
> criptográfica verificable por cualquiera + análisis IA del contenido,
> empaquetados en un Digital Trust Record.

Diferencial defendible: ningún competidor combina comprensión IA +
verificación independiente del proveedor (02 §Oportunidad Competitiva).

### 4. Solución (MVP)

- Subida de documento → análisis IA (resumen, clasificación, entidades)
  → DTR anclado en blockchain → verificación pública por hash/QR.
- Historial y panel de certificaciones del despacho.

### 5. Canales

- Venta directa fundador-liderada a despachos (fase validación).
- Landing con self-service trial (hipótesis H3).
- Colegios profesionales y asociaciones como canal de confianza
  (post-MVP).

### 6. Flujos de ingresos

| Flujo | Cuándo | Modelo |
|---|---|---|
| Suscripción SaaS | MVP | €/usuario/mes por plan |
| API por consumo | Post-MVP | €/DTR emitido |
| Enterprise / White Label | Evolución | Licencia anual + implantación |

### 7. Estructura de costes

Variables (por DTR): tokens LLM, gas de transacción (L2), OCR,
almacenamiento cifrado. Fijos: hosting (backend, frontend, PostgreSQL),
dominio, monitorización, herramientas. Cuantificación completa en
04-Viability.

### 8. Métricas clave

- DTRs emitidos/mes (métrica de actividad núcleo).
- Verificaciones realizadas por terceros (métrica de valor real: si
  nadie verifica, el producto es un archivador caro).
- Conversión trial → pago.
- Churn mensual por despacho.

### 9. Ventaja injusta

- Concepto DTR con verificación end-to-end independiente del proveedor
  (los incumbentes de firma no pueden ofrecerla sin canibalizar su
  modelo de evidencia propietaria).
- Trazabilidad AI-provenance alineada con AI Act (viento de cola
  regulatorio).

## Estrategia de Pricing (propuesta v1)

Anclada al benchmark del 02 y al valor por operación premium del
mercado (AES €2.50 / QES €10-15):

| Plan | Precio (sin IVA) | Incluye | Racional |
|---|---|---|---|
| **Trial** | Gratis 14 días | 10 DTRs | Estándar del mercado (Signaturit); alimenta H3 |
| **Profesional** | €19/usuario/mes | 25 DTRs/usuario/mes | Entrada por debajo de Business de Signaturit (€23) para compensar marca desconocida |
| **Despacho** | €39/usuario/mes | 100 DTRs/usuario/mes + branding + multiusuario | Dentro del rango €23-45 validado; margen para el volumen del segmento |
| **DTR adicional** | €0.90/unidad | pay-as-you-go | Muy por debajo de AES (€2.50): percepción de valor alta con coste marginal bajo |

Principios:

- Precio por **DTR incluido por usuario**, no ilimitado: el coste
  variable por DTR (IA + gas) hace peligroso el "unlimited" hasta
  conocer el consumo real.
- El plan Profesional debe cubrir el coste variable con margen bruto
  ≥80% (a validar en 04-Viability).
- Sin plan gratuito permanente en el MVP: el freemium atrae al segmento
  equivocado (freelancers) y genera coste variable sin ingreso.

## Decisiones

1. Fusionar Business Model Canvas y Lean Canvas en un único documento.
2. Modelo principal del MVP: **suscripción SaaS por usuario con cupo de
   DTRs**; API por consumo pospuesta a post-MVP.
3. Sin freemium permanente; trial de 14 días con cupo.
4. Precios v1: €19 / €39 por usuario/mes + €0.90 por DTR adicional,
   pendientes de contraste con unit economics (04) e hipótesis H3.

## Alternativas consideradas

- **Pricing por documento puro (sin suscripción)**: descartado para el
  MVP — ingresos impredecibles y sin recurrencia; se mantiene como
  add-on (DTR adicional) y futura API.
- **Plan ilimitado tipo Business+ (€38-45)**: descartado hasta conocer
  el coste variable real por DTR; riesgo de margen negativo con
  usuarios intensivos.
- **Freemium permanente**: descartado (coste variable por DTR + atrae
  segmento no objetivo).

## Riesgos

- Precios fijados sin validación con clientes reales: son hipótesis
  (H3), no hechos. Ajustar tras entrevistas y trial.
- Sensibilidad al coste de LLM y gas: si el coste por DTR supera ~€0.20,
  el margen del plan Profesional se erosiona (umbral a confirmar en 04).
- Los despachos exigen factura, RGPD y residencia de datos en la UE
  desde el día uno: requisito no funcional, no opcional.

## Referencias

- docs/01-Product-Vision.md §8 (segmento cabeza de playa)
- docs/02-Market-Research.md (benchmark de precios, julio 2026)
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md (qué certifica un DTR)

## Checklist

- [x] Lean Canvas completo
- [x] Planes y precios concretos anclados al benchmark
- [x] Flujos de ingresos MVP vs evolución
- [x] Decisiones y alternativas documentadas
- [ ] Unit economics contrastadas (pendiente: 04-Viability)
- [ ] Hipótesis H3 validada con clientes reales (pendiente: fase MVP)

## Próximo Documento

04-Viability.md
