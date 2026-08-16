# PRes — Detalles de Arquitectura de Ancrux

> **Propósito:** guía de presentación del proyecto ante un tribunal (y ante
> cualquier persona interesada). Recorre, de forma progresiva, las decisiones
> de arquitectura que se fueron tomando, por qué se eligió cada tecnología y
> qué se descartó. Cada decisión está respaldada por su ADR (Architecture
> Decision Record) en [`docs/adr/`](adr/).
>
> **Cómo leer este documento:** de arriba hacia abajo cuenta una historia —
> del problema a la solución, decisión por decisión. Si solo tienes 5 minutos,
> lee las secciones 0, 1, 2 y 12.

---

## 0. El pitch en 60 segundos

> **Ancrux certifica activos digitales combinando IA y blockchain: la IA
> comprende el contenido del documento y la blockchain certifica su integridad.
> Cada activo obtiene un _Digital Trust Record (DTR)_ verificable por cualquiera,
> sin necesidad de confiar en Ancrux.**

La frase clave —y el alma técnica del proyecto— es *sin necesidad de confiar en
Ancrux*: cualquier tercero puede recalcular el hash del documento y comprobarlo
contra la blockchain por su cuenta. La plataforma no es el árbitro de la verdad;
la matemática y la cadena lo son.

---

## 1. El problema y la tesis del producto

**El problema:** demostrar que un documento existía en una fecha, que no ha sido
alterado, y —esto es lo diferencial— que un análisis concreto se hizo sobre él.

**La trampa a evitar:** la simple prueba de existencia de un hash en blockchain
es hoy una *commodity gratuita* (OpenTimestamps). Si Ancrux solo hiciera eso,
sería "un OpenTimestamps con interfaz": indiferenciado y sin valor por el que
cobrar.

**La tesis:** el diferencial está en certificar también el **análisis de IA**
(resumen, clasificación) junto al documento, en una sola evidencia inmutable.
Esto conecta con una tendencia real de mercado (*AI-provenance*: probar qué dijo
qué modelo, sobre qué, y cuándo).

Toda la arquitectura se deriva de esta tesis. La primera decisión lo demuestra.

---

## 2. La decisión fundacional — qué se ancla en blockchain (ADR-001)

Antes de elegir una sola tecnología, hubo que decidir **qué evidencia se
registra**, porque eso define qué puede demostrar el producto.

**Decisión:** se ancla el **hash SHA-256 del DTR canónico completo** — un
documento JSON determinista que contiene, entre otras cosas, el hash del activo
y el resultado del análisis de IA.

Así, **una sola transacción certifica dos hechos**:
1. Existencia e integridad del **activo** en la fecha del anclaje.
2. Existencia e inmutabilidad del **análisis de IA** sobre ese activo, en esa fecha.

**Alternativas descartadas:**
- *Anclar solo el hash del activo* → no certifica la IA; reduce el producto a la
  commodity. Descartada.
- *Anclar ambos hashes por separado* → duplica coste y complejidad sin ganancia
  (el DTR ya contiene el hash del activo). Descartada.

**Consecuencia asumida:** el DTR es **inmutable tras el anclaje**. Corregir o
re-analizar genera una **nueva versión**. Esto no es un defecto: es trazabilidad
(qué modelo dijo qué, y cuándo). Y eleva la **canonicalización** a pieza crítica:
si cambiara la forma de serializar, se rompería la verificación de DTRs
históricos.

---

## 3. El corazón verificable — `dtr-core`

De ADR-001 nace la pieza más estratégica del sistema: **`@trustai/dtr-core`**, un
paquete TypeScript **puro** (sin framework) que implementa:

- **Canonicalización** determinista (RFC 8785 / JSON Canonicalization Scheme).
- **Hashing** SHA-256.
- **Verificación** de integridad.

¿Por qué importa tanto? Porque la **misma lógica** corre en tres lugares:
- en el **navegador** (la página pública recalcula el hash en el cliente),
- en la **API** (certifica),
- y como **librería open source** para que cualquiera verifique fuera de la
  plataforma.

Al ser una única implementación compartida, **es imposible que diverjan**. La
reproducibilidad —"verificá sin confiar en nosotros"— deja de ser una promesa y
pasa a ser código ejecutable. Por eso lleva la cobertura de tests más exigente
del proyecto.

---

## 4. El lenguaje del stack — full TypeScript (ADR-002)

La propuesta original era FastAPI (Python) + Next.js. Se cambió a **TypeScript de
punta a punta**. El razonamiento:

- **La IA solo se consume vía API.** Los SDKs oficiales (OpenAI, Mistral) en
  TypeScript cubren todo lo necesario. No se pierde nada real por no usar Python.
- **El ecosistema blockchain EVM es TypeScript-first** (viem, Foundry tooling).
  En Python es secundario.
- **Equipo de una sola persona.** El coste de saltar entre dos lenguajes y dos
  ecosistemas de tooling/testing es real y evitable.
- **El factor decisivo:** con un stack único, `dtr-core` se escribe **una vez** y
  corre en navegador, servidor y como librería. Con dos lenguajes, la pieza más
  crítica del producto habría que **duplicarla** — con riesgo de divergencia.

**El stack resultante:**

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (React + TypeScript) |
| Backend | NestJS (hexagonal) |
| ORM / BD | Prisma + PostgreSQL |
| Blockchain | viem (interacción) + Foundry (contrato) |
| Monorepo | pnpm workspaces con `dtr-core` compartido |

**Descartada** también la opción *Next.js full-stack sin NestJS*: el worker
asíncrono con reintentos y la arquitectura hexagonal (API First) encajan mucho
mejor en NestJS.

---

## 5. La cadena y el contrato mínimo (ADR-003)

Principio rector del proyecto: **la blockchain solo se usa para confianza e
inmutabilidad**, nada más. Todo lo demás (propiedad, versiones, permisos) vive
en la base de datos.

**Decisión:** un contrato Solidity **mínimo**, `AnchorRegistry` (~20 líneas
auditables): registra un `bytes32`, evita duplicados y emite un evento indexado.

Propiedades que lo hacen elegante:
- El **mismo `bytes32`** sirve para un hash individual **o** para un *Merkle root*
  de N documentos → activar *batching* de costes en el futuro **no requiere
  cambiar el contrato**.
- El **evento indexado** permite verificar y auditar desde cualquier explorador,
  sin depender de Ancrux.
- El `require` de duplicados hace el anclaje **idempotente**: los reintentos del
  worker no duplican evidencia.

**Red:** Base Sepolia (testnet L2). Se descartó Ethereum L1 por coste
(~1,10 USD/tx vs. céntimos en L2). La cadena es intercambiable detrás de un
puerto (`AnchorPort`).

**Estado real:** contrato desplegado en Base Sepolia, dirección
`0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22` (Solidity 0.8.24, Foundry).

---

## 6. La capa de IA como puerto intercambiable (ADR-004)

Requisito: el proveedor de IA debe ser **intercambiable**, y hay una motivación
de negocio real (RGPD: los despachos manejan documentación sensible y algunos
exigen residencia de datos en la UE).

**Decisión:** un puerto `AiAnalysisPort` con adaptadores. La salida es **siempre
estructurada** (JSON validado con Zod antes de entrar al dominio) e incluye
`provenance` obligatorio (proveedor, modelo, versión) que **se congela en el
DTR**.

- **OpenAI** como adaptador de referencia calidad/coste.
- **Mistral** (UE) como opción de residencia europea — el argumento comercial RGPD.

**Riesgo evitado a conciencia:** una "abstracción" con un solo adaptador degenera
en acoplamiento encubierto (la interfaz termina calcando la API del único
proveedor). Por eso el diseño contempla dos implementaciones reales.

> **Nota honesta de alcance (enmienda de ADR-004):** el MVP entrega **un
> adaptador real + un stub** de desarrollo/contingencia. El stub valida la
> abstracción del puerto igual que lo haría un segundo proveedor. El segundo
> adaptador real (Mistral) entra pre-lanzamiento comercial, cuando el argumento
> de residencia tenga clientes delante. La decisión de fondo no cambia.

---

## 7. El frontend (ADR-005)

ADR-002 fijó Next.js; ADR-005 baja al detalle:

- **App Router (RSC)** → SSR/metadata de primera para la página pública de
  verificación.
- **Tailwind + shadcn/ui** → componentes accesibles y de aspecto profesional sin
  diseñador; se copian al repo (no es una dependencia opaca).
- **TanStack Query** → resuelve nativamente el **polling** del estado del DTR
  mientras se ancla (`DRAFT → … → CERTIFIED`), que es parte del camino dorado.
- **Sesión en cookie httpOnly** (no `localStorage`) → el token queda fuera del
  alcance de JavaScript, mitigando XSS. Apropiado para el segmento (documentación
  sensible).

Beneficio que cierra el círculo con ADR-001: la página pública **recomputa el
hash con `dtr-core` en el navegador** → la reproducibilidad sin confiar en
Ancrux se demuestra en vivo, en el cliente.

---

## 8. Asincronía sin sobre-infraestructura — pg-boss

Certificar es asíncrono (subir → analizar con IA → anclar → confirmar en cadena).
Eso pide una cola de trabajos con reintentos.

**Decisión:** **pg-boss** — una cola que vive **sobre PostgreSQL**, en lugar de
Redis + BullMQ.

- **Menos infraestructura:** no se añade Redis solo para esto.
- **Transaccionalidad:** el job de anclaje se encola en la **misma transacción**
  que crea el DTR. No hay estados fantasma.
- **Coherente con el presupuesto** del MVP.

Además, **API y worker son el mismo código NestJS**, desplegables como procesos
separados: *monolito modular ahora, separable después*. Microservicios: **no**
para un equipo de una persona. (Umbral de revisión documentado: >10.000 jobs/día.)

---

## 9. El despliegue (ADR-006)

Una restricción técnica condiciona todo el hosting: **el worker debe estar
siempre vivo** (se auto-reencola cada 15 s hasta lograr 2 confirmaciones
on-chain). Esto **descarta los entornos serverless / scale-to-zero** para la API
(Lambda, Vercel Functions, Cloud Run scale-to-zero, free tier con spin-down):
matarían el worker y el anclaje nunca se completaría.

**Decisión — PaaS repartido:**
- **Vercel** → el web (soporte nativo de Next 16, preview deploys).
- **Railway** → API + worker (proceso caliente, siempre activo) + PostgreSQL
  gestionado.
- **Cloudflare R2** → almacenamiento de objetos S3-compatible (activos cifrados
  AES-256-GCM), sin coste en el volumen del MVP.

**Por qué esta y no un VPS único (más barato):** el TFM se evalúa por el
**producto** y por el **desarrollo asistido por IA**, no por destreza de
sysadmin. La fiabilidad de la demo del día de la defensa pesa más que ahorrar
unos euros o administrar TLS, backups y hardening a mano. (La opción VPS queda
documentada como camino alternativo si el objetivo virara a DevOps.)

**Estado real:** todo desplegado y accesible por URL, con anclaje probado contra
Base Sepolia real.

---

## 10. La arquitectura hexagonal en una imagen

La API sigue **puertos y adaptadores** (hexagonal). Esto es lo que hace que las
decisiones anteriores (IA y blockchain intercambiables) sean reales y no un
diagrama bonito:

| Capa | Contenido | Regla |
|---|---|---|
| **Dominio** | Agregados e invariantes (TrustRecord, Anchor…) | Cero dependencias de framework |
| **Aplicación** | Casos de uso (certificar, verificar…) | Orquesta dominio + puertos |
| **Puertos** | `AiAnalysisPort`, `AnchorPort`, `StoragePort`, `NotificationPort` | Interfaces hacia el exterior |
| **Adaptadores** | OpenAI/stub, viem/Base, S3/R2, notificación | Intercambiables |

Cambiar de proveedor de IA, de cadena o de almacenamiento = **nuevo adaptador +
configuración**; el dominio no se entera. Si mañana hiciera falta ML propio en
Python, se añadiría como un servicio aislado detrás de un puerto, sin romper nada.

> Diagramas C4 (contexto y contenedores) versionados en
> [`docs/diagrams/c4/`](diagrams/c4/) y embebidos en
> [`08-Architecture.md`](08-Architecture.md).

---

## 11. El recorrido de la demo (cómo se prueba en vivo)

La forma de presentar el producto a un tribunal es **ejecutarlo**. El guion es el
criterio de aceptación del MVP:

1. Un usuario se registra, verifica su email y entra.
2. Sube un PDF, revisa el análisis de IA, certifica, y ve el DTR pasar sus
   estados hasta **`CERTIFIED`**, con la transacción visible en el explorador de
   Base Sepolia.
3. **Un tercero, sin cuenta**, abre el enlace público / escanea el QR y obtiene
   veredicto **Válido**, con enlace a la transacción on-chain.
4. El mismo PDF con **un byte cambiado** → veredicto **No corresponde / alterado**.
5. La verificación es **reproducible sin Ancrux**: `dtr-core` permite comprobar
   el hash contra el contrato directamente.

Los pasos 3–5 son el momento fuerte: certificar en vivo, verificar en vivo,
romper un documento en vivo.

---

## 12. Honestidad de alcance — qué es MVP y qué queda fuera

Un buen proyecto de arquitectura se defiende tanto por lo que incluye como por lo
que **decide dejar fuera con criterio**:

- **Segundo adaptador IA real (Mistral):** fuera del MVP; el stub valida la
  abstracción. Entra con el primer cliente que pida residencia UE.
- **Batching Merkle:** el diseño ya lo soporta (mismo contrato); operarlo no
  aporta a la demo. Se activa con volumen real.
- **Multiusuario/roles, OCR, certificado PDF, billing:** recortes conscientes,
  cada uno con su condición de retorno documentada.
- **Testnet, no mainnet:** el gas es 0 y el diseño protege la UX ante fallos de
  red; el salto a mainnet exige revisión de seguridad del contrato.

Ninguno de estos recortes cambia la tesis del producto. Esa es la prueba de que
el alcance está bien trazado.

---

## 13. Cómo lo presento a cualquier persona interesada

**A alguien no técnico (30 segundos):**
> "¿Sabés cómo un sello notarial certifica que un documento existía en una fecha?
> Ancrux hace eso, pero automático y verificable por cualquiera: la inteligencia
> artificial lee y resume el documento, y la blockchain le pone un sello
> inmutable. Lo bueno es que no tenés que confiar en nosotros: cualquiera puede
> comprobar por su cuenta que el documento es auténtico, escaneando un código QR."

**A alguien técnico (2 minutos):**
> "Es una plataforma full-TypeScript, hexagonal. El núcleo es un paquete puro,
> `dtr-core`, que canonicaliza un _Digital Trust Record_ (documento + análisis de
> IA) con RFC 8785 y lo hashea con SHA-256. Ese hash se ancla en un contrato
> mínimo en Base Sepolia (L2), que también soporta Merkle roots para batching
> futuro sin cambiar el contrato. La IA y la blockchain están detrás de puertos,
> así que son intercambiables. El worker de anclaje corre sobre pg-boss (cola en
> Postgres, sin Redis extra) y es _always-on_ por eso va en Railway, no en
> serverless. Y la joya: la verificación es reproducible en el navegador con el
> mismo `dtr-core`, así que nadie necesita confiar en la plataforma para validar
> una evidencia."

**El cierre, para ambos:**
> "La arquitectura no es blockchain por moda. Cada pieza responde a una decisión
> registrada (ADR) con sus alternativas y trade-offs. La blockchain hace solo una
> cosa —dar inmutabilidad— y todo lo demás vive donde debe."

---

## 14. Q&A — las preguntas difíciles

**¿Por qué blockchain y no una base de datos firmada o una autoridad de sellado
de tiempo (TSA, RFC 3161)?**
Porque una TSA o una base firmada por Ancrux exigen **confiar en un tercero**
(en la TSA, o en nosotros). El objetivo del producto es justamente **eliminar esa
confianza**: la evidencia vive en un registro público e inmutable que nadie
controla, y cualquiera la verifica sin pasar por la plataforma. Un tercero
centralizado puede perder, reescribir o desaparecer; el ancla on-chain no. La
contrapartida —coste de gas y latencia— se mitiga con L2 y batching.

**¿Por qué testnet (Base Sepolia) y no mainnet? ¿No invalida la garantía?**
Es una decisión de **alcance de MVP, no de arquitectura**. La cadena está detrás
de un puerto (`AnchorPort`): pasar a Base mainnet es cambiar configuración, no
código. En testnet el gas es 0, ideal para desarrollar y demostrar. Honestamente:
en testnet las garantías de permanencia son menores, por eso el salto a mainnet
está documentado **con su condición** (revisión de seguridad del contrato antes).

**¿No es esto un monolito? ¿Por qué no microservicios?**
Es un **monolito modular deliberado**: API y worker comparten código NestJS pero
se despliegan como procesos separables. Microservicios para un equipo de una
persona añaden complejidad operativa (red, despliegues, observabilidad) sin
beneficio a este volumen. La arquitectura hexagonal ya deja las costuras: cuando
el volumen lo pida (umbral documentado: >10.000 jobs/día), el worker se separa
**sin reescribir el dominio**.

**¿Qué pasa si Ancrux desaparece mañana?**
La evidencia **sobrevive**. El hash está en Base (pública), el algoritmo de
verificación es `dtr-core` (corre en el navegador y puede publicarse open
source), y el usuario conserva su documento y su DTR (JSON). Cualquiera verifica
sin la plataforma. Ese es, literalmente, el criterio de diseño de ADR-001.

**¿La IA no es solo un "chatbot pegado"? ¿Y encima corre un stub?**
La IA no es el envoltorio: su salida (resumen, clasificación) **se congela dentro
del DTR anclado**, con su `provenance` (modelo, versión). Eso es lo que diferencia
el producto de un timestamping gratuito. El stub del MVP valida la abstracción del
puerto y sirve de contingencia de demo; el adaptador OpenAI real está
implementado y es un cambio de configuración. Con transparencia: para lucir el
valor conviene correr el adaptador real.

**¿Por qué pg-boss y no Redis + BullMQ, que es el estándar?**
Porque **no necesito una pieza de infraestructura extra**. pg-boss pone la cola en
el Postgres que ya tengo, lo que da **transaccionalidad** (el job se encola en la
misma transacción que crea el DTR) y menos superficie operativa. BullMQ es
excelente a escala; a este volumen sería sobre-ingeniería. El umbral para
reconsiderarlo está documentado.

**¿Cómo garantizan que el hash calculado en el navegador es idéntico al del
servidor?**
Con una **única implementación compartida** (`dtr-core`) y **canonicalización
determinista** (RFC 8785): misma entrada → mismos bytes → mismo hash, en cualquier
entorno. No hay dos copias del algoritmo que puedan divergir. Por eso esa pieza
lleva la cobertura de tests más exigente del proyecto.

**El documento es sensible. ¿Va a la blockchain?**
**No.** A la cadena solo va un hash (`bytes32`), que no revela el contenido. El
documento se guarda **cifrado (AES-256-GCM)** en object storage. La blockchain
solo guarda evidencia criptográfica — es el principio rector: cadena para
inmutabilidad, nunca para datos.

**¿Por qué full TypeScript si Python domina la IA?**
Porque **no entreno modelos, consumo APIs** de LLM, y sus SDKs en TypeScript
cubren todo. En cambio, el ecosistema blockchain EVM es TS-first, y con un solo
lenguaje comparto la pieza crítica (`dtr-core`) entre navegador y servidor **sin
duplicarla**. Si algún día necesitara ML propio, la hexagonal permite meter un
servicio Python detrás de un puerto.

**El LLM no es determinista. ¿No rompe eso la reproducibilidad?**
No, porque lo que se verifica **no** es "volver a generar el mismo análisis", sino
que **el análisis que se hizo no ha cambiado**. La salida de la IA se congela en
el DTR y se hashea junto al resto. Re-ejecutar con otro modelo produce otro
DTR/versión — eso es **trazabilidad, no un fallo**. La reproducibilidad aplica a
la verificación del hash, que sí es 100% determinista.

**¿Qué impide que alguien certifique un documento que no es suyo?**
Ancrux certifica **existencia e integridad en una fecha, no autoría legal**. El
ancla prueba "este contenido y este análisis existían en este momento", no "esta
persona es el autor legítimo". La identidad se apoya en la cuenta autenticada
(metadatos), y el producto es explícito en su *disclaimer*: **no es una firma
electrónica cualificada (eIDAS)**. Es una distinción importante y honesta.

**Seguridad — ¿dónde vive la clave privada del worker? ¿Y si se filtra?**
Hoy es una **variable de entorno de la plataforma** (Railway), no está en el repo.
Para mainnet está documentado el salto a un *secrets manager*. En testnet el
riesgo es acotado (el gas no tiene valor real). Y el contrato es **idempotente**:
incluso con acceso, no se puede duplicar ni sobrescribir una evidencia existente.

**Coste y escala — ¿y si crece el volumen?**
Dos palancas **ya previstas en el diseño**: **L2** (céntimos por transacción frente
a dólares en L1) y **batching Merkle** — el contrato ya acepta un *Merkle root* en
el mismo `bytes32`, así que N documentos se anclan en **una sola transacción sin
cambiar el contrato**. Cada DTR guardaría su *Merkle proof* y `dtr-core` verifica
proofs.

---

## Anexo — Índice de decisiones (ADRs)

| ADR | Decisión | Sección |
|---|---|---|
| [ADR-001](adr/ADR-001-anclaje-hash-dtr-canonico.md) | Anclar el hash del DTR canónico (activo + IA en una tx) | §2 |
| [ADR-002](adr/ADR-002-stack-full-typescript.md) | Stack full TypeScript (Next.js + NestJS + Prisma) | §4 |
| [ADR-003](adr/ADR-003-contrato-minimo-anchor-registry.md) | Contrato mínimo `AnchorRegistry` en L2 | §5 |
| [ADR-004](adr/ADR-004-doble-adaptador-ia.md) | IA detrás de un puerto (OpenAI + Mistral; stub en MVP) | §6 |
| [ADR-005](adr/ADR-005-frontend-app-router-tailwind-tanstack.md) | Frontend: App Router + Tailwind/shadcn + TanStack + cookie httpOnly | §7 |
| [ADR-006](adr/ADR-006-stack-de-despliegue-mvp.md) | Despliegue: Vercel + Railway + R2 | §9 |

> Documentación completa: [`docs/TDD-Index.md`](TDD-Index.md).
