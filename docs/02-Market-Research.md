# 02 - Market Research

**Proyecto:** Ancrux
**Versión:** 2.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Analizar el mercado con datos verificables (competidores reales, precios
públicos y tendencias) para validar la oportunidad de una plataforma de
confianza digital basada en IA y Blockchain, y aportar el benchmark de
precios que alimentará el Business Model (03) y el estudio de
viabilidad (04).

## Alcance

- Análisis de competidores directos e indirectos por categoría, con
  nombres, precios y posicionamiento.
- Benchmark de precios de mercado (julio 2026).
- Identificación del hueco competitivo de Ancrux.
- Hipótesis de negocio y plan de validación.

Fuera de alcance: dimensionamiento TAM/SAM/SOM con fuentes de pago
(informes Gartner/IDC) y entrevistas a clientes; se abordarán si el
producto avanza más allá del MVP.

## Contexto

Las organizaciones necesitan demostrar integridad documental, reducir
revisiones manuales, verificar autenticidad y disponer de trazabilidad.
Las soluciones actuales resuelven partes aisladas del problema: firma
electrónica, gestión documental, notarización blockchain o análisis
documental con IA.

## Análisis de Competidores

### Categoría 1: Firma electrónica

#### DocuSign (líder global)

Precios públicos (julio 2026, fuente: docusign.com/pricing):

| Plan | Precio | Límite |
|---|---|---|
| Personal | $11/mes | 5 envelopes/mes |
| Standard | $30/usuario/mes | 100 envelopes/usuario/año |
| Business Pro | $45/usuario/mes | 100 envelopes/usuario/año |
| Add-on: verificación de identidad | desde $2.40/verificación | — |

Posicionamiento: ha evolucionado hacia "Intelligent Agreement
Management" (IAM) con IA para gestión y análisis de acuerdos. Señal
relevante: el líder de la categoría ya está integrando IA documental.

Debilidad frente a Ancrux: la evidencia queda dentro de su plataforma
(certificate of completion propietario); no ofrece verificación
independiente del proveedor.

#### Signaturit Group / Namirial (líder en España y sur de Europa)

Precios públicos (julio 2026, fuente: signaturit.com/pricing):

| Plan | Precio (sin IVA) | Límite |
|---|---|---|
| Personal | €9/mes | 5 transacciones/mes |
| Business | €23/usuario/mes | 10 transacciones/usuario/mes |
| Business+ | €38/usuario/mes | Transacciones ilimitadas |
| Firma avanzada (AES) | €2.50/firma | add-on |
| Firma cualificada (QES) | €10–15/firma | add-on |

Posicionamiento: cumplimiento eIDAS/RGPD, mercado español y europeo.
Relevante para Ancrux por ser el referente de precios en nuestro
mercado inicial (España).

Debilidad frente a Ancrux: sin inteligencia documental (no resume, no
clasifica, no extrae entidades).

### Categoría 2: Notarización / timestamping blockchain

#### OriginStamp (Suiza, desde 2013)

- Anclaje en Bitcoin y Ethereum, más de 60 millones de pruebas creadas.
- API-first, orientado a empresa; precios no públicos (contacto
  comercial).
- Señal estratégica importante: ya comercializa "Provable AI Results"
  (certificación de outputs de IA para el AI Act europeo). Valida la
  tendencia IA + timestamping y a la vez es una amenaza directa.

Debilidad frente a Ancrux: certifica el hash pero no comprende el
contenido; no genera resumen, clasificación ni entidades.

#### OpenTimestamps (estándar abierto, gratuito)

- Estándar de facto para proof-of-existence sobre Bitcoin.
- Servidores de calendario gratuitos, sin registro ni API key.
- Usado por Zoho Sign, Verisart y decenas de empresas.

**Implicación crítica para Ancrux**: la prueba de existencia "a secas"
es una commodity con coste marginal cero. Nadie pagará por el anclaje
en sí. El valor por el que se puede cobrar está en la capa superior:
comprensión IA del contenido, flujo de trabajo, experiencia de
verificación y el DTR como evidencia integrada.

#### WordProof (Países Bajos)

- Timestamping de contenido web (WordPress, Shopify) orientado a SEO y
  copyright; más de 5.8 millones de elementos certificados.
- Ganador del concurso "Blockchains for Social Good" de la Comisión
  Europea (€1M): señal de apoyo institucional europeo a esta categoría.
- Plan gratuito; precios de pago no transparentes.

Debilidad frente a Ancrux: nicho de contenido web, no de activos
documentales empresariales.

### Categoría 3: Gestión documental

Fortaleza: organización y colaboración (SharePoint, Google Workspace,
M-Files). Debilidad: escasa verificabilidad independiente; la
integridad depende de confiar en el proveedor.

### Categoría 4: Plataformas de IA documental

Fortaleza: comprensión del contenido (LLMs generalistas, herramientas
de document intelligence). Debilidad: no generan evidencia
criptográfica verificable; sus outputs no son auditables ante terceros.

## Benchmark de Precios (síntesis)

Rango de disposición a pagar observado en el mercado (julio 2026):

- Plan individual/freelance: **€9–11/mes** con ~5 operaciones incluidas.
- Plan profesional/PYME: **€23–45/usuario/mes**.
- Operación certificada premium (AES/QES): **€2.50–15/unidad**.
- Timestamping simple: **€0** (OpenTimestamps) — commodity.

Este benchmark es el insumo directo del pricing en 03-Business-Model y
del punto de equilibrio en 04-Viability.

## Oportunidad Competitiva

Ningún competidor analizado combina en un solo flujo:

1. Comprensión IA del contenido (resumen, clasificación, entidades).
2. Evidencia criptográfica anclada en blockchain, verificable de forma
   independiente del proveedor.
3. Un artefacto unificado (el **Digital Trust Record**) que empaqueta
   ambas cosas con verificación pública por hash/QR.

Los más cercanos: OriginStamp (le falta la comprensión del contenido) y
DocuSign IAM (le falta la verificabilidad independiente).

## Análisis SWOT

### Fortalezas
- Combinación única IA + evidencia verificable (DTR).
- Arquitectura API First y modular.
- Coste unitario por DTR medible y bajo (anclaje en L2 + LLM).

### Debilidades
- Marca desconocida frente a líderes consolidados.
- Complejidad técnica de integrar dos dominios (IA y blockchain).
- Sin reconocimiento legal eIDAS en el MVP (no es firma cualificada).

### Oportunidades
- AI Act europeo: demanda emergente de provenance de outputs de IA
  (OriginStamp ya la explota).
- Cumplimiento normativo y auditoría como drivers de compra.
- Digitalización de despachos y PYMEs en España.

### Amenazas
- DocuSign/Namirial pueden añadir anclaje blockchain como feature.
- OriginStamp puede añadir comprensión IA.
- El timestamping gratuito (OpenTimestamps) presiona el precio a la
  baja si el valor no se comunica en la capa de inteligencia.
- Cambios regulatorios (eIDAS 2, AI Act) en ambas direcciones.

## Hipótesis a Validar

| # | Hipótesis | Método de validación | Criterio de éxito |
|---|---|---|---|
| H1 | Los usuarios valoran una prueba verificable independiente del proveedor | Entrevistas con 5-10 profesionales del segmento objetivo | ≥60% lo identifica como diferencial |
| H2 | El resumen/clasificación IA reduce tiempo de gestión documental | Test con documentos reales durante el MVP | Reducción medible ≥30% vs revisión manual |
| H3 | Existe disposición a pagar en el rango €10–30/mes | Landing page con pricing + lista de espera | ≥5% conversión a registro de interés |

## Decisiones

- El mercado de referencia inicial es España (benchmark Signaturit).
- El posicionamiento de precio del MVP debe situarse en el rango
  €9–30/mes validado por el mercado.
- El discurso de venta NO puede centrarse en el timestamping (commodity
  gratuita): debe centrarse en el DTR como evidencia inteligente.

## Alternativas Consideradas

- Competir por precio en timestamping puro: descartado (OpenTimestamps
  es gratis; carrera al fondo).
- Posicionarse como firma electrónica: descartado (requiere
  acreditación eIDAS como prestador cualificado; barrera regulatoria y
  de capital fuera del alcance del MVP).

## Riesgos

- Precios y features de competidores cambian con frecuencia: este
  análisis debe revisarse antes de fijar pricing definitivo.
- El TAM/SAM/SOM no está cuantificado con fuentes primarias; las
  decisiones de inversión fuertes requerirán ese análisis.

## Referencias

- DocuSign Pricing — https://www.docusign.com/pricing (consultado 05/07/2026)
- Signaturit/Namirial Pricing — https://www.signaturit.com/pricing (consultado 05/07/2026)
- OriginStamp — https://originstamp.com (consultado 05/07/2026)
- OpenTimestamps — https://opentimestamps.org (consultado 05/07/2026)
- WordProof — https://wordproof.com (consultado 05/07/2026)

## Checklist

- [x] Competidores identificados con nombre y precios públicos
- [x] Benchmark de precios para 03 y 04
- [x] Hueco competitivo articulado
- [x] Hipótesis con método de validación y criterio de éxito
- [ ] TAM/SAM/SOM cuantificado (pospuesto, fuera de alcance MVP)
- [ ] Entrevistas de validación con usuarios (pendiente, fase MVP)

## Próximo Documento

03-Business-Model.md
