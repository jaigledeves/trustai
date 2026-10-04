#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { createViemChainReader } from "./chain-reader.js";
import { runCli } from "./run.js";

process.exitCode = await runCli(process.argv.slice(2), {
  statFile: async (path) => {
    const stats = await stat(path);
    return { size: stats.size, isFile: stats.isFile() };
  },
  readFile: async (path) => new Uint8Array(await readFile(path)),
  fetch: globalThis.fetch,
  createChainReader: createViemChainReader,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
});
