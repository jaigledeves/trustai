# @trustai/api

NestJS API for TrustAI — hexagonal architecture (domain / ports / adapters / application / modules).

## Dev runtime

```bash
pnpm --filter @trustai/api run start:dev
```

### Spike findings (TASK-0 / task 2.1)

Design decision D6 flagged `ts-node`/`tsx` + decorators + DI as a risk area to validate before
building the real auth vertical slice. This package uses `module: CommonJS` /
`moduleResolution: Node` (not `NodeNext`), so the risk was scoped to plain CommonJS decorator
metadata support, not ESM interop.

**`tsx` (esbuild-based) does NOT work — constructor-based DI silently breaks.**

- `tsx` transpiles TypeScript via esbuild, which does not implement TypeScript's
  `emitDecoratorMetadata` transform (tracked upstream: evanw/esbuild#1713). `Reflect.getMetadata("design:paramtypes", SomeClass)`
  returns `undefined` for every class compiled by esbuild.
- NestJS's constructor injection reads `design:paramtypes` to resolve providers. With `tsx`,
  every injected constructor parameter comes through as `undefined` at runtime — Nest boots and
  maps routes successfully (no error!), but any handler that touches an injected dependency
  throws `Cannot read properties of undefined (...)`. This is a *silent* failure mode, not a
  boot-time error, which makes it especially dangerous to miss.

**`ts-node` (and `ts-node-dev` for watch mode) work correctly.**

- `ts-node`'s TypeScript-compiler-based transform emits `design:paramtypes` correctly, including
  in `--transpile-only` (single-file, no type-checking) mode — the decorator metadata transform is
  syntactic (it re-emits the type's identifier reference), not dependent on full program-wide type
  checking, so the fast/isolated transpile path is safe to use for dev.
- Verified end-to-end: booted a minimal `AppModule` (a throwaway `SpikeController` +
  `SpikeService` in `app.module.ts`, replaced by the real feature modules in PR2) via
  `ts-node-dev --respawn --transpile-only`, and `GET /spike` correctly returned a value produced
  through DI-injected `SpikeService`.
- `start:dev` uses `ts-node-dev`; `tsx` was removed from devDependencies.

**Secondary finding: `.js`-suffixed relative imports break under `ts-node`.**

- PR1 wrote relative imports with an explicit `.js` extension (e.g.
  `from "../domain/user.entity.js"`), following the `NodeNext` convention from
  `tsconfig.base.json`. `apps/api/tsconfig.json` overrides this to `module: CommonJS` /
  `moduleResolution: Node`, so `.js` extensions are unnecessary for this package.
- `tsc` silently tolerates `.js` extensions pointing at `.ts` files at *type-check* time, and after
  a real `tsc` build the extension is valid again (the emitted `.js` files really do exist as
  siblings). But `ts-node` (and plain `node` before any build step exists) resolve `require()`
  calls directly against the filesystem — there is no `app.module.js` file, only `app.module.ts` —
  so the process crashes with `MODULE_NOT_FOUND`.
- Fix: all relative imports in `apps/api/src` are extension-less (e.g.
  `from "../domain/user.entity"`), matching plain CommonJS/Node resolution. Convention for this
  package going forward: **no extensions on relative imports**.

### Convention: dev runner

Use `pnpm --filter @trustai/api run start:dev` (backed by `ts-node-dev`). Do not switch back to
`tsx`/esbuild-based tooling for this package without also solving decorator-metadata emission
(e.g. via an esbuild plugin that walks the TS AST, or SWC's native `decoratorMetadata` support) —
otherwise DI silently breaks at runtime instead of failing at boot.

### Related finding: Vitest has the same decorator-metadata gap (fixed via `unplugin-swc`)

Vitest also transforms TypeScript via esbuild by default (through Vite), so any test that boots a
real Nest module (`NestFactory.create`, `Test.createTestingModule(...).compile()`) hits the exact
same silent-DI-failure bug described above — confirmed with a throwaway spike test before writing
the real e2e suite. Both `vitest.config.ts` and `vitest.e2e.config.ts` load the `unplugin-swc`
Vite plugin (`swc.vite({ module: { type: "es6" } })`), which compiles test files through SWC
instead, restoring correct `design:paramtypes` emission. `module: { type: "commonjs" }` must NOT
be used here — it makes SWC rewrite the test file's own `import ... from "vitest"` into a
`require()`, which Vitest's ESM-only package rejects at runtime.

### Testing

```bash
pnpm --filter @trustai/api run test      # unit tests, no DB required
pnpm --filter @trustai/api run test:e2e  # e2e tests, requires PostgreSQL
```

`test/auth.e2e-spec.ts` needs a real PostgreSQL reachable via `DATABASE_URL` (D7 — real ephemeral
Postgres, not a mock/SQLite substitute) with the schema applied (`prisma db push` or, once a real
migration exists, `prisma migrate deploy`). If `DATABASE_URL` is unset or the database is
unreachable, `test/utils/db-availability.ts` detects this and the whole `describe` block is
skipped via `describe.skipIf(...)` rather than failing the run. `test/health.e2e-spec.ts` never
needs a database — it overrides `PrismaService` with a no-op stub, since a liveness check
shouldn't depend on DB connectivity in the first place.

Verified locally against a disposable `postgres:16-alpine` Docker container (`prisma db push`,
no migration files yet — see Open Questions in design.md): all 12 e2e assertions pass, including
the two that initially caught a real bug — see "Gotcha" below.

**Gotcha — `Test.createTestingModule(...)` does not run `main.ts`'s `bootstrap()`.** The global
`ValidationPipe` (and any other `app.use*` call in `main.ts`) is NOT applied automatically to an
app built via Nest's testing utilities; it must be re-registered explicitly in the e2e spec's
`beforeAll`. Missing this made `S-AUTH-3`/`S-AUTH-4` (malformed email / weak password) silently
return `201` instead of `400` during development of this suite, because `class-validator`
decorators on `RegisterDto`/`LoginDto` were never being enforced.

### Spike findings (Phase 0 / task 0.1 — certification-flow): transactional pg-boss enqueue

design.md's open question: does making pg-boss's `send()` atomic with a DTR row write (so the
job never gets enqueued if the surrounding write rolls back, and vice versa) require bumping
Prisma from v6 to v7 (to use pg-boss's built-in `fromPrisma()` adapter with
`@prisma/adapter-pg`), or can a hand-rolled wrapper avoid the bump?

**Decision: hand-rolled `IDatabase` wrapper over Prisma v6's `$transaction` callback. No Prisma
version bump.**

- pg-boss's transactional `db` option (accepted by `send`, `sendAfter`, `insert`, `flow`, ...)
  only requires an object implementing `IDatabase`: `executeSql(text, values) => Promise<{ rows }>`.
  This is the entire contract — see `pg-boss`'s own `fromKnex`/`fromKysely`/`fromDrizzle`/`fromPrisma`
  adapters, which are all ~10-line wrappers around this one method.
- pg-boss ships a `fromPrisma()` helper, but its docs state it "Requires Prisma v7+ with
  `@prisma/adapter-pg`". Inspecting its actual implementation
  (`node_modules/pg-boss/dist/adapters/prisma.js`) shows it only calls
  `tx.$queryRawUnsafe(text, ...values)` on the object passed to `prisma.$transaction(async (tx) => ...)`.
  `$queryRawUnsafe` on the transaction client has been available since early Prisma versions —
  including the v6.19.3 already used by this project — so the "v7+" requirement in pg-boss's docs
  is a documentation/support-scope choice by its maintainer, not a technical necessity of what the
  function does.
- **Verified empirically** with a throwaway spike script (`prisma db push` against a local
  `postgres:16-alpine` container, `pg-boss@12.25.1`): a ~10-line wrapper —
  `{ executeSql: (text, values) => tx.$queryRawUnsafe(text, ...values).then(rows => ({ rows })) }` —
  passed to `boss.send(queue, data, { db: wrapper })` inside `prisma.$transaction(async (tx) => {...})`:
  - **Commit path**: an `Organization` row write + `boss.send(...)` in the same transaction both
    persisted together.
  - **Rollback path**: throwing inside the same transaction (after both the row write and the
    `boss.send(...)` call) rolled back *both* — the organization row was never persisted and no
    job row appeared in the pg-boss job table. Confirmed atomicity in both directions.
- **Risk comparison**:
  - Prisma v6→v7 bump: major-version upgrade mid-change, touches every existing repository/adapter
    in `apps/api` (`PrismaService`, `UserRepository`, all future Prisma repositories in this
    change), requires adding `@prisma/adapter-pg` and switching `PrismaClient` construction to the
    driver-adapter pattern, and risks subtle behavior differences across the entire auth vertical
    slice this change does not otherwise need to touch. High risk, high blast radius, for a
    capability (`fromPrisma()`) that a 10-line hand-rolled function fully replicates on the current
    Prisma version.
  - Hand-rolled `IDatabase` wrapper: ~10 lines, zero new production dependencies beyond `pg-boss`
    itself, zero changes to existing Prisma usage, isolated to the one call site
    (`UploadAssetUseCase`'s `analyze-document` enqueue in Phase 2/3) that needs the transactional
    guarantee. Low risk, low blast radius.
  - Per this change's own guidance ("prefer the lower-risk option if both work"), and since both
    options work, **the hand-rolled wrapper is the chosen approach.** It will be implemented as
    `src/adapters/queue/prisma-pgboss-db.adapter.ts` in task 1.4 and reused wherever a job must be
    enqueued atomically with a DTR write.
- **Residual risk carried forward**: this wrapper depends on pg-boss's `db` option contract
  remaining a plain `{ executeSql }` interface. If a future pg-boss major version changes that
  contract, revisit — but the same risk would apply equally to the `fromPrisma()` adapter, so this
  is not a risk specific to choosing the hand-rolled path.
