# Propuesta de Proyecto TFM: TrustAI

## Resumen Ejecutivo

**TrustAI** es una plataforma de certificación inteligente de activos
digitales que combina Inteligencia Artificial (IA) y Blockchain para
aportar confianza, trazabilidad e inmutabilidad. La IA analiza y
comprende documentos; la blockchain certifica su existencia e integridad
mediante hashes y marcas temporales.

## Problema

-   Dificultad para demostrar la existencia de un documento en una fecha
    determinada.
-   Riesgo de manipulación documental.
-   Procesos manuales para revisar y clasificar documentos.
-   Dependencia de terceros para verificar autenticidad.

## Propuesta de Valor

-   Certificación verificable mediante blockchain.
-   Análisis automático con IA (resumen, clasificación y extracción de
    información).
-   Verificación pública mediante QR y hash.
-   Arquitectura preparada para evolucionar a un SaaS.

## Objetivos

### General

Desarrollar un MVP funcional que integre IA y blockchain para certificar
y verificar documentos.

### Específicos

-   Subida segura de documentos.
-   Cálculo de hash SHA-256.
-   Análisis con IA.
-   Registro del hash en un smart contract.
-   Verificación de autenticidad.
-   Generación de QR.

## Alcance del MVP

### Incluye

1.  Autenticación de usuarios.
2.  Gestión de documentos (PDF e imágenes).
3.  Resumen y clasificación mediante IA.
4.  Registro de hash, timestamp e identificador de versión en
    blockchain.
5.  Verificación documental.
6.  Panel básico e historial.

### Fuera del MVP

-   Búsqueda semántica.
-   Comparación inteligente de versiones.
-   Detección avanzada de fraude.
-   Integración con IPFS.
-   API pública.
-   Gestión multiempresa.

## Arquitectura Propuesta

-   Frontend: Next.js + React + TypeScript.
-   Backend: FastAPI.
-   Base de datos: PostgreSQL.
-   Blockchain: Solidity sobre red EVM de pruebas.
-   IA: LLM para resumen y clasificación; OCR para imágenes.
-   Contenedores: Docker.

## Factibilidad

### Técnica

Alta. Todas las tecnologías son maduras y ampliamente documentadas.

### Económica

Costes reducidos durante el desarrollo utilizando testnet y servicios
cloud gratuitos o de bajo coste.

### Temporal

Proyecto abordable en un TFM dividido en: - Diseño. - Desarrollo. -
Integración. - Validación. - Documentación.

## Riesgos

-   Integración entre IA y blockchain.
-   Coste de APIs de IA.
-   Gestión segura de documentos.

Mitigación: - Arquitectura desacoplada. - Abstracción de proveedores
IA. - Cifrado y control de acceso.

## Monetización

### SaaS

Suscripción mensual por número de documentos.

### API

Cobro por verificación o certificación.

### B2B

Licencias para empresas, despachos, consultoras, universidades y
aseguradoras.

### White Label

Implementación personalizada para organizaciones.

## Roadmap

### Fase 1

MVP académico.

### Fase 2

Integración con almacenamiento descentralizado.

### Fase 3

Comparación inteligente de versiones.

### Fase 4

Marketplace de verificaciones y API pública.

## Valor Académico

El proyecto demuestra integración de IA, blockchain, criptografía,
arquitectura de software, APIs y despliegue moderno.

## Valor Comercial

El diseño permite evolucionar el MVP hacia un producto comercial
escalable sin rediseñar la arquitectura.
