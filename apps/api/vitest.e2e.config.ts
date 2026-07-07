import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// See vitest.config.ts for why this plugin is required — e2e specs boot a
// real Nest application (NestFactory/TestingModule) and therefore need
// working constructor DI.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
