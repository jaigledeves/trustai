# TrustAI - Documento Maestro de Estrategia

## Visión General

El objetivo no es construir únicamente un Trabajo Fin de Máster, sino
sentar las bases de un producto tecnológico real, documentado con
estándares profesionales y preparado para evolucionar hacia un SaaS
comercial.

## Principios

-   Resolver un problema real antes que demostrar una tecnología.
-   Utilizar la IA como acelerador de valor.
-   Utilizar Blockchain únicamente donde aporta confianza e
    inmutabilidad.
-   Diseñar una arquitectura modular y escalable.
-   Documentar todas las decisiones de arquitectura.

## Propuesta de Valor

TrustAI será una plataforma de certificación inteligente de activos
digitales mediante IA y Blockchain.

La IA comprenderá el contenido (resumen, clasificación, extracción de
información, OCR y análisis).

La Blockchain certificará la existencia e integridad del activo mediante
hash, timestamp y versionado.

## Problema que resuelve

-   Prueba de existencia.
-   Integridad documental.
-   Verificación independiente.
-   Comprensión automática mediante IA.
-   Base para auditoría y trazabilidad.

## MVP

### Incluye

-   Gestión de usuarios.
-   Subida de PDF e imágenes.
-   Cálculo SHA-256.
-   Resumen y clasificación con IA.
-   Registro del hash en Smart Contract.
-   Historial.
-   Verificación.
-   Código QR.

### Fuera del MVP

-   Embeddings y búsqueda semántica.
-   Comparación inteligente de versiones.
-   IPFS.
-   Multiempresa.
-   API pública.
-   Agentes IA.

## Arquitectura propuesta

Frontend: - Next.js - React - TypeScript

Backend: - FastAPI

Base de datos: - PostgreSQL

Blockchain: - Solidity sobre red EVM de pruebas

IA: - LLM - OCR

Infraestructura: - Docker - CI/CD

## Modelo de monetización

-   SaaS por suscripción.
-   API de certificación.
-   Licencias Enterprise.
-   White Label.
-   Marketplace de verificaciones (futuro).

## Metodología

### Fase 1 -- Product Discovery

-   Product Vision.
-   Business Model Canvas.
-   Lean Canvas.
-   Market Research.
-   Personas.
-   Casos de uso.
-   MVP.

### Fase 2 -- Arquitectura

-   C4 Model.
-   Modelo de dominio.
-   Base de datos.
-   Smart Contracts.
-   Arquitectura IA.
-   API.
-   Seguridad.
-   DevOps.
-   ADR.

### Fase 3 -- Desarrollo

-   Backend.
-   Frontend.
-   Blockchain.
-   IA.
-   Integración.
-   Despliegue.

### Fase 4 -- TFM

-   Memoria.
-   Resultados.
-   Defensa.
-   Trabajo futuro.

## Estructura documental objetivo

    docs/
    00-executive-summary.md
    01-product-vision.md
    02-market-analysis.md
    03-business-model.md
    04-requirements.md
    05-use-cases.md
    06-domain-model.md
    07-c4-architecture.md
    08-database-design.md
    09-smart-contracts.md
    10-ai-architecture.md
    11-api-design.md
    12-security.md
    13-devops.md
    14-testing.md
    15-roadmap.md
    16-monetization.md
    17-feasibility-study.md
    18-project-plan.md
    19-tfm-report.md

## Filosofía

No construiremos una aplicación aislada, sino una plataforma modular
preparada para crecer mediante nuevos módulos especializados (contratos,
propiedad intelectual, certificados, código fuente, etc.).

Cada decisión técnica quedará respaldada por un ADR (Architecture
Decision Record), con justificación de alternativas y motivos de
elección.

## Próximo paso

Redactar el documento **Product Vision**, que actuará como la brújula
del proyecto y definirá misión, visión, clientes, propuesta de valor,
alcance y principios de diseño.
