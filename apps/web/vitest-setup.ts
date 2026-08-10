import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./test/msw/server";

// jsdom doesn't implement `window.matchMedia` (spec: web-theme — "System
// Theme Follows OS Preference"). Any test that renders `ThemeToggle` with
// `initialPreference="system"` needs a default no-op implementation;
// individual tests can still override it with `vi.stubGlobal("matchMedia",
// ...)` before rendering, which takes precedence for that test.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Global msw lifecycle: start once, reset handlers between tests (so one
// test's `server.use(...)` override never leaks into the next), and shut
// down after the whole file. Individual tests only need to import
// `server` from `./test/msw/server` to add per-test handlers.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
