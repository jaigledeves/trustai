import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./test/msw/server";

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
