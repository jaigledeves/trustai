import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Next.js App Router code (route handlers, RSC-adjacent modules) and React
// component tests both live in this project, so we need the React plugin
// (JSX transform) plus a browser-like DOM for Testing Library. Playwright
// e2e specs live in `e2e/` and are run separately (`pnpm test:e2e`), never
// picked up by Vitest.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest-setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["app/**", "components/**", "lib/**", "middleware.ts"],
      exclude: ["**/*.test.{ts,tsx}", "app/**/layout.tsx", "app/**/page.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
