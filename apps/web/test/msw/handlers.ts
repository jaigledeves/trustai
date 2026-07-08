import { http, type HttpHandler } from "msw";

/**
 * Default (happy-path-agnostic) request handlers for the mocked NestJS API.
 *
 * This file starts empty on purpose: each slice/task adds the handlers its
 * own tests need via `server.use(...)` (per-test overrides) or by extending
 * this array once a handler is shared across multiple test files. Keeping
 * it empty here means `onUnhandledRequest: "error"` (vitest-setup.ts) will
 * loudly fail any test that forgets to mock a request it makes — no silent
 * passthrough to a real network call.
 */
export const handlers: HttpHandler[] = [];
