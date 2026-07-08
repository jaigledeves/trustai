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
    // Multiple e2e files each boot their own full AppModule (including
    // WorkerModule's JobRegistrationService), all registering pg-boss
    // `boss.work()` consumers against the SAME shared Postgres schema.
    // pg-boss dispatches jobs to whichever registered worker across ALL
    // running processes claims them first — with file-level parallelism,
    // an anchor-dtr/confirm-anchor job created by one file's app instance
    // (correctly configured with a real ANCHOR_PORT) could be picked up
    // by a DIFFERENT file's app instance (whose ANCHOR_PORT defaults to
    // ChainNotConfiguredAnchorAdapter), causing spurious job failures.
    // Sequential file execution avoids this cross-instance race entirely.
    fileParallelism: false,
  },
});
