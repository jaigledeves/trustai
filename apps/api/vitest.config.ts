import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// NestJS constructor DI relies on TypeScript's `emitDecoratorMetadata`
// (design:paramtypes). Vitest's default esbuild transform does not emit it
// (same root cause documented in README.md for the `tsx` dev-runner spike),
// so injection silently resolves to `undefined` instead of failing loudly.
// `unplugin-swc` compiles test files through SWC, which does emit decorator
// metadata, fixing DI for any test that boots a real Nest module/TestingModule.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  test: {
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/main.ts"],
    },
  },
});
