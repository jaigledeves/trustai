# Ancrux -- Product Vision Document

**Versión:** 1.1\
**Estado:** Draft\
**Proyecto:** MVP + Producto Comercial\
**Fecha:** Julio 2026

# 1. Introducción

La transformación digital ha incrementado exponencialmente la creación y
el intercambio de activos digitales. Sin embargo, garantizar su
autenticidad, integridad, trazabilidad y comprensión continúa siendo un
desafío para organizaciones y profesionales.

Ancrux propone una plataforma que combina Inteligencia Artificial y
Blockchain para construir confianza digital sobre cualquier activo
digital.

# 2. Visión

> Convertirse en la plataforma de referencia para la certificación
> inteligente de activos digitales mediante IA y Blockchain.

# 3. Misión

Permitir que cualquier persona u organización pueda demostrar la
autenticidad, integridad y existencia de un activo digital mediante un
proceso sencillo, automatizado y verificable.

# 4. Problema

Las organizaciones generan miles de activos digitales cuya autenticidad,
trazabilidad y clasificación requieren procesos manuales o herramientas
aisladas.

# 5. Oportunidad

La IA comprende el contenido.

La Blockchain certifica su integridad.

La combinación de ambas crea un nuevo paradigma de confianza digital.

# 6. Propuesta de Valor

Cada activo genera un **Digital Trust Record (DTR)** compuesto por:

-   Hash SHA-256
-   Timestamp
-   Resumen generado por IA
-   Clasificación automática
-   Entidades relevantes
-   Metadatos
-   Identificador de versión
-   Registro en Blockchain

El activo nunca se almacena en la blockchain; únicamente la evidencia
criptográfica.

**Qué se certifica**: en blockchain se ancla el **hash del DTR canónico
completo** (que a su vez contiene el hash SHA-256 del activo). Una sola
transacción certifica dos hechos: (1) el activo existía en esa fecha y
(2) el análisis de IA sobre ese activo se produjo en esa fecha con ese
contenido exacto. Ver ADR-001.

# 7. Digital Trust Record

El DTR es el núcleo conceptual del producto.

Representa la identidad digital verificable de cualquier activo.

``` text
Activo Digital ──────────────► Hash SHA-256 del activo
      │                                │
      ▼                                │
 Inteligencia Artificial               │
      │                                │
      ▼                                ▼
Resumen • Clasificación • Entidades • Metadatos
      │
      ▼
DTR canónico (JSON determinista)
      │
      ▼
Hash SHA-256 del DTR
      │
      ▼
Blockchain (anclaje)
      │
      ▼
Digital Trust Record verificable
```

# 8. Público Objetivo

## Segmento cabeza de playa (MVP)

**Despachos profesionales y consultoras** (España como mercado
inicial).

Justificación (ver 02-Market-Research):

-   Dolor real y recurrente: integridad documental, prueba de
    existencia, trazabilidad ante clientes y auditorías.
-   Disposición a pagar validada por el mercado: €23--45/usuario/mes en
    la categoría (benchmark Signaturit/DocuSign).
-   Volumen documental suficiente para que el análisis IA aporte valor
    medible.

## Segmentos secundarios (post-MVP)

-   Profesionales independientes
-   Startups
-   PYMEs

## Evolución

-   Universidades
-   Hospitales
-   Administraciones Públicas
-   Aseguradoras
-   Grandes empresas

# 9. Principios

-   IA con propósito.
-   Blockchain solo donde aporta valor.
-   API First.
-   Modularidad.
-   Escalabilidad.
-   Seguridad por diseño.

# 10. Objetivos del MVP

-   Registro de usuarios.
-   Gestión de activos digitales.
-   Análisis mediante IA.
-   Generación de DTR.
-   Certificación blockchain.
-   Verificación por hash y QR.
-   Historial de certificaciones.

# 11. Fuera del MVP

-   Búsqueda semántica.
-   Comparación inteligente de versiones.
-   IPFS.
-   Agentes IA.
-   Certificación de repositorios Git.
-   Multiempresa.

# 12. Indicadores de éxito

-   Certificación reproducible: el mismo activo genera el mismo hash y
    el DTR es verificable end-to-end en el 100% de los casos.
-   Verificación independiente: un tercero puede verificar un DTR sin
    depender de la plataforma (solo con el activo, el DTR y acceso a la
    blockchain).
-   Reducción del tiempo de análisis documental ≥30% frente a revisión
    manual (hipótesis H2 del Market Research, medida durante el MVP).
-   Arquitectura preparada para evolucionar a SaaS sin rediseño
    (validada en la fase de arquitectura).

# 13. Visión a cinco años

Ancrux evolucionará hacia una plataforma de confianza digital basada en
un núcleo estable de certificación y módulos especializados para
diferentes sectores.

# Conclusión

El Product Vision establece las bases estratégicas del proyecto. Todas
las decisiones de arquitectura, desarrollo y negocio deberán alinearse
con este documento durante el ciclo de vida del producto.
