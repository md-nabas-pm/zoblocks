#!/usr/bin/env node

/**
 * zoblocks-mcp — the ZoBlocks catalog for coding agents, over stdio.
 *
 * A thin shell, like the CLI's: read the version, hand argv to runStdio().
 * The published package ships `dist`, and that is what this loads; falling
 * back to `src` keeps it runnable from a checkout, where there is no build.
 */

import { existsSync, readFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const built = path.join(root, "dist", "stdio.js");
const entry = existsSync(built) ? built : path.join(root, "src", "stdio.ts");
const { runStdio } = await import(pathToFileURL(entry).href);

const code = await runStdio({
  argv: argv.slice(2),
  version,
  out: (line) => stdout.write(`${line}\n`),
  err: (line) => stderr.write(`${line}\n`),
});

// `undefined` means the server is running: stay alive until the client closes stdin.
if (code !== undefined) exit(code);
