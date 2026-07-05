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
