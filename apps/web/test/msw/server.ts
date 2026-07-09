import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Node-side msw server, used by vitest-setup.ts for every test file (route
// handler tests, component tests that call fetch, etc). Tests add scoped
// overrides with `server.use(...)`; vitest-setup.ts resets them after each
// test so overrides never bleed across test files.
export const server = setupServer(...handlers);
