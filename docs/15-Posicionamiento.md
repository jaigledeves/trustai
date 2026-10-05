# 15 - Posicionamiento: qué demuestra un DTR y qué no

**Estado:** draft (2026-10-04)
**Alcance:** garantías reales de un registro `dtr-2` de Ancrux y su
comparación con otros mecanismos de evidencia digital (RFC 3161, firmas y
sellos eIDAS, registros electrónicos, OpenTimestamps, Blockcerts/VC, C2PA).
Fuentes primarias verificadas el 2026-10-04; ver [Fuentes](#9-fuentes).

> **Resumen.** Un DTR `dtr-2` demuestra que un archivo concreto y un registro
> de emisión existían, sin cambios, no más tarde que un bloque de Base
> Sepolia, y cualquiera puede comprobarlo sin confiar en Ancrux. No
> identifica a quien subió el archivo, no valida el contenido ni el análisis
> de IA, y no tiene efectos jurídicos cualificados: Ancrux no es un
> prestador cualificado de servicios de confianza.

Este análisis no constituye asesoramiento jurídico.

## 1. Para qué sirve este documento

- Fijar qué se puede afirmar públicamente sobre un DTR y qué no (fase D del
  [roadmap](14-Roadmap.md)).
- Situar Ancrux frente a las alternativas reguladas y técnicas, con la
  fuente de cada afirmación.
- Dejar explícitos los caminos hacia un estatus cualificado y las dudas
  legales abiertas.

Las referencias a artículos de eIDAS remiten al Reglamento (UE) 910/2014 en
su versión consolidada tras el Reglamento (UE) 2024/1183 [S1][S2].

## 2. Qué demuestra un DTR (`dtr-2`)

| # | Garantía | Quién puede comprobarla | Base |
|---|---|---|---|
| 1 | **Integridad del archivo.** `coreHash` se recalcula desde el archivo (SHA-256, tipo MIME verificado por el servidor, tamaño) sin ningún dato de Ancrux. | Cualquiera con el archivo | [ADR-015](adr/ADR-015-dtr-2-nucleo-y-enriquecimiento-separados.md) |
| 2 | **Compromiso con una emisión.** `anchorHash` está en el contrato inmutable `AnchorRegistry`, con el `block.timestamp` del bloque. | Cualquiera con el archivo, el paquete de prueba y un nodo RPC público | [ADR-016](adr/ADR-016-paquete-de-prueba-publico.md) |
| 3 | **Existencia no posterior a la hora del bloque.** En OP Stack (Base) el secuenciador elige la marca de tiempo dentro de `l1_origin.timestamp <= block.timestamp <= l1_origin.timestamp + max_sequencer_drift` (1800 s desde Fjord), con bloques cada 2 s. | Cualquiera | [S18] |
| 4 | **Salida de IA sin cambios desde el anclaje.** Solo para quien tenga el enriquecimiento completo: el paquete público lo compromete (`enrichmentHash`) sin revelarlo. | Quien tenga el enriquecimiento | ADR-015, ADR-016 |

**Solo afirmado por Ancrux** (no lo prueba la cadena):

- `issuedAt`: es una declaración de Ancrux. La única hora externa es la del
  bloque.
- Procedencia de la IA (`provider`, `model`, `promptVersion`, etc.): son
  declaraciones de Ancrux, quedan congeladas pero nadie las valida.

## 3. Qué NO demuestra

| No demuestra | Por qué | Fuente |
|---|---|---|
| La identidad de quien subió el archivo, de forma cualificada | No hay verificación de identidad del art. 24 ni firma avanzada o cualificada | [S1] |
| La validez jurídica o la veracidad del contenido | Igual que en VC 2.0 y C2PA, verificar no implica que lo afirmado sea cierto | [S14][S17] |
| La corrección del resumen o la clasificación de la IA | La salida se congela, no se valida | ADR-015 |
| Un sello de tiempo cualificado | Sin QTSP, sin requisitos del art. 42, sin garantía de exactitud UTC; no aplica la presunción del art. 41(2) | [S1] |
| Un registro en un libro mayor electrónico cualificado | Base Sepolia no la opera un QTSP y no hay origen por registro con certificados cualificados (art. 45l(1)(a) y (b)) | [S1] |
| Evidencia de producción a largo plazo | Base Sepolia es una red de pruebas: su ETH no tiene valor real y las testnets se retiran (Holesky, 2025). Que Base Sepolia conserve su historial es una **suposición no verificada** | [S19] |
| Que Ancrux sea un prestador cualificado | Ancrux no es QTSP ni figura en ninguna lista de confianza (art. 22) | [S1] |

**Admisibilidad.** Un DTR sigue siendo una prueba admisible que el tribunal
valora libremente: eIDAS impide negar efectos jurídicos solo por ser
electrónico o no cualificado (arts. 41(1), 45k(1) y 46), y en España rige la
LEC art. 326.3. La carga de acreditar su fiabilidad recae en quien la aporta
[S1][S9].

## 4. Comparación

| Mecanismo | Tiempo | Integridad | Identidad del emisor o firmante | Procedencia del contenido | Presunción en la UE | Ancla de confianza |
|---|---|---|---|---|---|---|
| **Ancrux DTR (`dtr-2`)** | No posterior al bloque (testnet) | Sí | No (sin firma) | Salida de IA congelada, no validada | Ninguna | Consenso de Base/Ethereum + declaraciones de Ancrux |
| Sello de tiempo RFC 3161 | Sí, UTC | Sí | No (del solicitante) | No | Art. 41(2) si es cualificado | TSA |
| Firma avanzada/cualificada (AES/QES) o sello | No (salvo con sello de tiempo) | Sí | Sí | No | Arts. 25(2) / 35(2) | CA / QTSP |
| Registro electrónico cualificado | Orden cronológico | Sí | Origen obligatorio | No | Art. 45k(2) | QTSP |
| OpenTimestamps | No posterior a, unas 2-3 h | Sí | No | No | Ninguna | Bitcoin |
| Blockcerts / VC | Declarada por el emisor / hora del anclaje | Sí | Clave o dominio del emisor | Afirmaciones del emisor | Ninguna (salvo declaración cualificada de atributos) | Emisor (+ cadena) |
| C2PA | Sello TSA opcional | Sí | Certificado del firmante | Sí (aserciones) | Ninguna por sí misma | CA de listas de confianza |

Fuentes de la tabla: [S1][S5][S12][S13][S14][S15][S17][S18].

### Sello de tiempo RFC 3161

- **Qué prueba:** que un hash existía no más tarde de `genTime` (UTC, con
  precisión opcional), vinculado por la firma de la TSA. No identifica al
  solicitante (RFC 3161 §2.1) [S5].
- **Modelo de confianza:** clave, reloj y prácticas de la TSA. Si es
  cualificada, el QTSP se audita al menos cada 24 meses (art. 20) y figura
  en listas de confianza (art. 22) [S1].
- **Efecto jurídico:** art. 41(1), no discriminación del sello no
  cualificado; art. 41(2), el cualificado goza de presunción de exactitud de
  fecha y hora y de integridad de los datos; art. 42, requisitos (vínculo,
  fuente ligada a UTC, firma o sello avanzado del QTSP) [S1]. El Reglamento
  de Ejecución (UE) 2025/1929 remite a ETSI EN 319 421/422 (**verificado
  parcialmente**) [S7]. En España, la Ley 6/2020 (art. 3.2) remite a la LEC:
  art. 326.3 para el no cualificado y 326.4 para el cualificado, donde se
  presume la característica impugnada y quien impugna asume la carga y el
  coste [S9][S10].

### Firmas avanzadas y cualificadas (AES/QES) y sellos

- **Qué prueba:** la AES está vinculada al firmante de forma única, lo
  identifica, está bajo su control exclusivo con alto nivel de confianza y
  detecta cambios posteriores (art. 26); QES, art. 3(12). No prueba la hora
  sin un sello de tiempo [S1].
- **Modelo de confianza:** verificación de identidad por la CA o el QTSP
  (art. 24(1)) [S1].
- **Efecto jurídico:** art. 25(1), no discriminación; art. 25(2), la QES
  equivale a la firma manuscrita; art. 35(2), el sello cualificado presume
  integridad y origen correcto [S1]. Coste por firma, según el benchmark de
  [02-Market-Research.md](02-Market-Research.md) (Signaturit: unos 2,50 € la
  AES y 10-15 € la QES).

### Registro electrónico cualificado (eIDAS 2.0)

- **Qué prueba:** orden cronológico secuencial único e integridad de los
  registros. Definiciones en el art. 3(52) (libro mayor electrónico) y 3(53)
  (cualificado); es un servicio de confianza según el art. 3(16)(n) [S1].
- **Modelo de confianza:** un QTSP supervisado, no una red sin confianza. El
  art. 45l(1) exige (a) que lo creen y gestionen uno o varios QTSP, (b) que
  se establezca el origen de los registros, (c) orden cronológico secuencial
  único y (d) que los cambios posteriores sean detectables de inmediato. El
  art. 13(1) presume la negligencia del QTSP a efectos de responsabilidad
  [S1]. El Reglamento de Ejecución (UE) 2025/2531 cita ETSI EN 319 401, ISO
  23257:2022 para DLT, origen mediante firma o sello avanzado con
  certificado cualificado y listas o árboles de hashes SHA-256 o superior
  (**verificado parcialmente**, a través de resúmenes secundarios; el
  detalle del anexo **no está verificado**) [S6][S8].
- **Efecto jurídico:** art. 45k(1), no discriminación; art. 45k(2), los
  registros cualificados presumen orden cronológico secuencial único y
  exacto e integridad. **No** presumen la exactitud de fecha y hora: eso
  corresponde al sello cualificado del art. 41(2) [S1].

### OpenTimestamps

- **Qué prueba:** que los datos existían antes de un momento dado; agrega
  hashes en Bitcoin. Los calendarios no pueden falsificar sellos (en el peor
  caso, denegación de servicio). La hora de bloque suele ser exacta con un
  margen de 2-3 horas. No prueba autoría [S12][S13].
- **Modelo de confianza:** consenso de Bitcoin. Calendarios gratuitos.
- **Efecto jurídico:** solo prueba no cualificada; su clasificación en
  eIDAS **no está verificada**.

### Blockcerts y W3C Verifiable Credentials

- **Qué prueba:** VC 2.0 (Recomendación W3C del 15 de mayo de 2025) es
  evidente ante manipulación y su autoría es verificable criptográficamente,
  pero "la verificabilidad no implica la veracidad de las afirmaciones"
  [S14]. Blockcerts ancla una raíz Merkle en Bitcoin o Ethereum, identifica
  al emisor por URI HTTP o DID con claves y usa listas de revocación
  [S15][S16].
- **Modelo de confianza:** el emisor (sus claves y su dominio), más la
  cadena para la hora del anclaje.
- **Efecto jurídico:** sin presunción eIDAS por sí mismo. La declaración
  cualificada de atributos es otro servicio (arts. 3(16)(g) y 45h); el
  artículo que fija su efecto **no se ha verificado** [S1].

### C2PA

- **Qué prueba:** aserciones de procedencia firmadas con la credencial del
  firmante (X.509, listas de confianza de C2PA). El generador de la
  declaración debería obtener un sello RFC 3161. La especificación no juzga
  la veracidad del contenido y cubre la incrustación en PDF [S17].
- **Modelo de confianza:** CA de las listas de confianza de C2PA.
- **Efecto jurídico:** sin estatus eIDAS específico.

## 5. Dónde se sitúa Ancrux

Ancrux combina una prueba de existencia de la misma clase que
OpenTimestamps con un registro estructurado enriquecido por IA, un paquete
de prueba público y versionado (`ancrux-proof-1`) y una separación que
permite verificar el archivo sin el texto de la IA (ADR-015, ADR-016). No
autentica al emisor ni al usuario que sube el archivo y no goza de ninguna
presunción legal. Su valor diferencial es técnico y de producto, no de
estatus jurídico.

## 6. Caminos hacia un estatus cualificado

Todas las rutas son hipótesis de trabajo, no compromisos del roadmap.

| # | Ruta | Qué aportaría | Qué no cambia |
|---|---|---|---|
| 1 | **La más barata:** incluir un sello RFC 3161 cualificado, de un QTSP en lista, sobre `anchorHash` o el hash del archivo, en un formato nuevo (`ancrux-proof-2`) | Art. 41(2) y LEC 326.4 para ese hash [S1][S9] | Ancrux sigue siendo un integrador no cualificado |
| 2 | Sello electrónico cualificado de la entidad jurídica de Ancrux sobre el DTR o el paquete | Art. 35(2): presunción de que Ancrux lo emitió [S1] | Nada sobre quien subió el archivo |
| 3 | Que los usuarios firmen con QES o AES (cartera europea de identidad digital o firma de un QTSP) | Identidad del firmante (arts. 25 y 26) [S1][S3] | Requiere integrar al proveedor de firma |
| 4 | Ancrux como registro electrónico cualificado: hacerse QTSP (notificación del art. 21, auditorías del art. 20, lista del art. 22) y cumplir el art. 45l y el Reglamento 2025/2531 | Art. 45k(2) [S1][S6] | Es la ruta más costosa |
| 5 | En cualquier caso, mover el anclaje de Base Sepolia a una red de producción antes de cualquier afirmación probatoria | Longevidad de la evidencia [S19] | No aporta presunción por sí misma |

**Inferencia (ruta 4):** es poco probable que una L2 pública sin permisos,
en red de pruebas y con un secuenciador que no es QTSP, cumpla el art. 45l.
Es una inferencia a partir del art. 45l(1)(a) [S1], no una conclusión
verificada; habría que confirmarla con un organismo de evaluación de la
conformidad [S11].

## 7. Exposición regulatoria

**No verificado; requiere asesoramiento jurídico.** Cobrar por "registrar
datos electrónicos en un libro mayor electrónico" podría convertir a Ancrux
en prestador no cualificado de servicios de confianza, con las obligaciones
del art. 19a de eIDAS y la supervisión prevista en el art. 14 de la Ley
6/2020 [S1][S10]. No se ha verificado si anclar en una cadena pública que
Ancrux no opera cuenta como prestación de ese servicio.

## 8. Límites de este análisis

- Los anexos de los Reglamentos de Ejecución 2025/1929 y 2025/2531 solo se
  han leído a través de resúmenes secundarios [S7][S8].
- No se ha extraído el artículo que fija el efecto de la declaración de
  atributos.
- No se ha verificado la política de retención del historial de Base
  Sepolia ni el precio de los sellos de un QTSP.
- La clasificación jurídica de OpenTimestamps o de Ancrux como libro mayor
  electrónico o sello de tiempo eIDAS es una interpretación.
- Este documento no constituye asesoramiento jurídico.

## 9. Fuentes

La numeración conserva la del informe de investigación de la fase D (no hay
S4).

1. [S1] Reglamento (UE) n.º 910/2014, texto consolidado a 2024-10-18 — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02014R0910-20241018
2. [S2] Reglamento (UE) 2024/1183 — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32024R1183
3. [S3] Comisión Europea, EUDI Regulation — https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation
4. [S5] RFC 3161 — https://www.rfc-editor.org/rfc/rfc3161
5. [S6] Reglamento de Ejecución (UE) 2025/2531 — https://eur-lex.europa.eu/eli/reg_impl/2025/2531/oj/eng
6. [S7] Reglamento de Ejecución (UE) 2025/1929 — https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32025R1929
7. [S8] iGrant.io, resumen del acto de ejecución sobre libros mayores electrónicos cualificados — https://docs.igrant.io/regulations/implementing-acts-qualified-electronic-ledgers/
8. [S9] LEC, art. 326 (BOE) — https://www.boe.es/buscar/act.php?id=BOE-A-2000-323
9. [S10] Ley 6/2020 (BOE) — https://www.boe.es/buscar/act.php?id=BOE-A-2020-14046
10. [S11] LSTI, eIDAS v2 Qualified Electronic Ledgers — https://www.lsti-certification.fr/en/Company-offers/Digital-Trust/eIDAS-V2-Qualified-Electronic-Registers
11. [S12] OpenTimestamps — https://opentimestamps.org/
12. [S13] Peter Todd, anuncio de OpenTimestamps — https://petertodd.org/2016/opentimestamps-announcement
13. [S14] W3C Verifiable Credentials Data Model 2.0 — https://www.w3.org/TR/vc-data-model-2.0/
14. [S15] Blockcerts, proceso de verificación — https://github.com/blockchain-certificates/cert-verifier-js/blob/master/docs/verification-process.md
15. [S16] cert-verifier-js — https://github.com/blockchain-certificates/cert-verifier-js
16. [S17] Especificación C2PA 2.2 — https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
17. [S18] Especificación de derivación de OP Stack — https://specs.optimism.io/protocol/derivation.html
18. [S19] ethereum.org, Networks — https://ethereum.org/en/developers/docs/networks/
