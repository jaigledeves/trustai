# ADR-008: DTO de query validado para los filtros de la lista de DTR

**Estado:** Aceptada
**Fecha:** 04/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `paginate-search-dtr-list`; ADR-007 (métodos org-scoped del repo)

## Contexto

- `GET /trust-records` (`TrustRecordsController.list`) hoy recibe `page` y
  `pageSize` como parámetros sueltos, validados con pipes de NestJS
  (`DefaultValuePipe` + `ParseIntPipe`) y normalizados imperativamente en el
  controller (`Math.max(1, …)` y `Math.min(…, 100)`).
- El cambio `paginate-search-dtr-list` añade dos filtros nuevos: `search`
  (nombre de archivo, `contains` case-insensitive) y `state` (uno de
  `TrustRecordState`).
- El `ValidationPipe` global (`main.ts`) ya corre con `transform: true` y
  `whitelist: true` (los parámetros desconocidos se descartan en silencio).
- No existe todavía en la API ninguna convención de **DTO de query validado**:
  todos los endpoints con query usan `@Query("x")` crudo con pipes.
- Contrato pre-existente y testeado (e2e S-DTR-11): `pageSize=500` responde
  `pageSize: 100` (recorte, 200 OK) y `page=0` responde página 1 — nunca un 400.

## Problema

¿Cómo validar los filtros nuevos (`state` sobre todo) sin (a) dispersar
comprobaciones ad-hoc en el controller, (b) que un `state` inválido acabe en un
500, ni (c) romper el contrato tolerante de paginación ya shippeado?

## Alternativas consideradas

### A. Seguir con pipes crudos + `if` manuales en el controller

- Pros: sin patrón nuevo; cambio local mínimo.
- Contras: cada filtro nuevo agranda validación imperativa en el controller; un
  `state` fuera del enum, si se pasa tal cual a Prisma, revienta como 500; la
  validación queda lejos de la forma del parámetro y sin reflejarse en Swagger.
- **Descartada.**

### B. DTO de query validado con class-validator (elegida)

- Pros: validación declarativa y colocada junto al contrato; `@IsEnum` da un
  400 para un `state` inválido **gratis** (nunca 500); se alinea con
  `whitelist: true`; se auto-documenta en Swagger (`@ApiPropertyOptional`);
  espeja el patrón ya existente de `ReviewTrustRecordDto`.
- Contras: introduce una convención nueva que hay que mantener; depende de que
  `transform: true` esté activo en el pipe global.

## Decisión

Se crea `ListTrustRecordsQueryDto` y `list` pasa a recibir `@Query() query:
ListTrustRecordsQueryDto`. Regla clave de diseño:

- **Los números se recortan, no se rechazan.** `page`/`pageSize` se coercionan
  y clampean con `@Transform` (basura → default, fuera de rango → límite más
  cercano). Esto **preserva** el contrato tolerante testeado por S-DTR-11.
  Pasar `page`/`pageSize` a rechazo con `@Min`/`@Max` habría sido un cambio de
  contrato no anunciado.
- **El enum se rechaza.** `@IsEnum(TrustRecordState)` devuelve 400 ante un
  `state` fuera del enum. Ésta es la ganancia real de validación. `search`
  lleva un guard `@MaxLength(200)`.

```typescript
export class ListTrustRecordsQueryDto {
  @IsOptional() @Transform(({ value }) => clampInt(value, 1, MAX_SAFE, 1))
  page: number = 1;

  @IsOptional() @Transform(({ value }) => clampInt(value, 1, 100, 20))
  pageSize: number = 20;

  @IsOptional() @IsString() @MaxLength(200) search?: string;

  @IsOptional() @IsEnum(TrustRecordState) state?: TrustRecordState;
}
```

El repositorio conserva su clamp defensivo `Math.max(1, …)` (última línea antes
de Prisma), independiente del caller.

## Consecuencias

**Positivas**

- Un `state` inválido devuelve 400 de forma declarativa, no un 500.
- El contrato de paginación tolerante se mantiene byte a byte (S-DTR-11 verde
  sin tocar).
- Queda establecida la primera convención de DTO de query validado, replicable
  por futuros endpoints con filtros.

**Negativas / coste asumido**

- Una clase DTO nueva y su spec unitario que mantener.
- Comportamiento mixto (números clampean, enum rechaza): documentado aquí y en
  los comentarios del DTO para que no sorprenda.

**Seguimiento**

- Si se añaden más filtros (p. ej. rango de fechas), reutilizar este DTO.
- Índices de BD sobre `createdAt`/`state`/`filename` quedan fuera de alcance —
  mejora de performance futura cuando el volumen lo justifique.

## Referencias

- `openspec/changes/paginate-search-dtr-list/design.md`
- `openspec/changes/paginate-search-dtr-list/specs/web-dtr-list/spec.md`
- `apps/api/src/modules/trust-records/dto/list-trust-records-query.dto.ts`
- `apps/api/src/modules/trust-records/trust-records.controller.ts`
- RNF-004 (org-scoping a nivel de query)
