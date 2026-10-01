/**
 * `zoblocks mcp init` and `zoblocks skill add` — connecting coding agents to
 * ZoBlocks (ADR 0017).
 *
 * Both are file writers, so the CLI stays dependency-free (ADR 0016), and both
 * follow the rules `add` already keeps: they write only inside the project,
 * never overwrite something the developer changed without being told to, and
 * say what they touched.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CLIENTS,
  SERVER_NAME,
  configSnippet,
  findClient,
  type Client,
  type Transport,
} from "./agents.js";
import type { CommandContext } from "./commands.js";
import { HOMEPAGE } from "./constants.js";

/* ------------------------------------------------------------------ */
/* mcp init                                                           */
/* ------------------------------------------------------------------ */

export interface McpInitOptions {
  client?: string;
  local: boolean;
  force: boolean;
  dryRun: boolean;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function listClients(out: (line: string) => void) {
  out("  Choose an agent with --client:");
  out("");
  for (const client of CLIENTS) out(`    ${client.id.padEnd(10)} ${client.label}`);
}

function printBlock(out: (line: string) => void, text: string) {
  out("");
  for (const line of text.trimEnd().split("\n")) out(`    ${line}`);
}

export async function mcpInit(context: CommandContext, options: McpInitOptions): Promise<number> {
  const { cwd, out, err } = context;

  if (!options.client) {
    err("Which agent? zoblocks mcp init --client <agent>");
    err("");
    listClients(err);
    return 1;
  }

  const client = findClient(options.client);
  if (!client) {
    err(`Unknown agent "${options.client}".`);
    err("");
    listClients(err);
    return 1;
  }

  const transport: Transport = options.local ? "local" : "remote";
  const how =
    transport === "remote"
      ? "the hosted server, https://zoblocks.design/mcp"
      : "a local server (npx -y @zoblocks/mcp)";

  if (client.kind === "manual") {
    out(`${client.label} keeps its MCP servers outside this project, so this prints the`);
    out(`entry rather than writing it. Add it under "${client.container}" in ${client.where}:`);
    printBlock(out, configSnippet(client, transport).code);
    out("");
    out(`  ${client.next}`);
    return 0;
  }

  const file = path.join(cwd, client.file);
  const result =
    client.kind === "json"
      ? await writeJson(file, client, transport, options)
      : await writeToml(file, client, transport, options);

  if (result.status === "refused") {
    err(result.message);
    printBlock(err, result.snippet);
    return 1;
  }

  const verb = {
    written: "write ",
    updated: "update",
    unchanged: "same  ",
    "would write": "would",
  }[result.status];
  out(`  ${verb} ${client.file}`);
  out("");
  out(`  ${client.label} → ${how}.`);
  if (result.status !== "unchanged" && result.status !== "would write") out(`  ${client.next}`);
  return 0;
}

type WriteResult =
  | { status: "written" | "updated" | "unchanged" | "would write" }
  | { status: "refused"; message: string; snippet: string };

async function writeJson(
  file: string,
  client: Client & { kind: "json" },
  transport: Transport,
  options: McpInitOptions,
): Promise<WriteResult> {
  const entry = client.entry(transport);
  const snippet = configSnippet(client, transport).code;

  let config: Record<string, unknown> = {};
  const exists = existsSync(file);
  if (exists) {
    try {
      const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("not an object");
      config = parsed as Record<string, unknown>;
    } catch {
      /*
       * Not JSON this can read — most often comments, which VS Code allows in
       * its own files. Rewriting it would drop them, so it is left alone and
       * the entry is printed to add by hand.
       */
      return {
        status: "refused",
        message: `${client.file} is not plain JSON (comments?), so it was left as it is. Add this under "${client.container}":`,
        snippet,
      };
    }
  }

  const servers = (config[client.container] ?? {}) as Record<string, unknown>;
  if (servers[SERVER_NAME] !== undefined) {
    if (sameJson(servers[SERVER_NAME], entry)) return { status: "unchanged" };
    if (!options.force) {
      return {
        status: "refused",
        message: `${client.file} already has a "${SERVER_NAME}" server with different settings. Pass --force to replace it with:`,
        snippet,
      };
    }
  }

  if (options.dryRun) return { status: "would write" };
  config[client.container] = { ...servers, [SERVER_NAME]: entry };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { status: exists ? "updated" : "written" };
}

async function writeToml(
  file: string,
  client: Client & { kind: "toml" },
  transport: Transport,
  options: McpInitOptions,
): Promise<WriteResult> {
  const block = client.entry(transport);
  const exists = existsSync(file);
  const source = exists ? await readFile(file, "utf8") : "";

  /*
   * One table, found by its header and replaced as a whole — from
   * `[mcp_servers.zoblocks]` to the next table header. Everything else in the
   * file is kept byte for byte, which a TOML round-trip would not promise
   * without a dependency.
   */
  const header = `[mcp_servers.${SERVER_NAME}]`;
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.trim() === header);

  if (start !== -1) {
    let end = lines.findIndex((line, i) => i > start && /^\s*\[/.test(line));
    if (end === -1) end = lines.length;
    const current = `${lines.slice(start, end).join("\n").trimEnd()}\n`;
    if (current === block) return { status: "unchanged" };
    if (!options.force) {
      return {
        status: "refused",
        message: `${client.file} already has ${header} with different settings. Pass --force to replace it with:`,
        snippet: block,
      };
    }
    if (options.dryRun) return { status: "would write" };
    const next = [
      ...lines.slice(0, start),
      block.trimEnd(),
      ...(end < lines.length ? ["", ...lines.slice(end)] : []),
    ];
    await writeFile(file, `${next.join("\n").trimEnd()}\n`, "utf8");
    return { status: "updated" };
  }

  if (options.dryRun) return { status: "would write" };
  await mkdir(path.dirname(file), { recursive: true });
  const content = source.trim() ? `${source.trimEnd()}\n\n${block}` : block;
  await writeFile(file, content, "utf8");
  return { status: exists ? "updated" : "written" };
}

/* ------------------------------------------------------------------ */
/* skill add                                                          */
/* ------------------------------------------------------------------ */

export const SKILL_URL = `${HOMEPAGE}/ai/skill.json`;

/**
 * Where the skill is written. Between them these two are read by every agent
 * ZoBlocks documents: `.agents/skills` by Codex, Cursor, VS Code, Gemini CLI,
 * Windsurf and Roo Code; `.claude/skills` by Claude Code and Cline (and, as a
 * fallback, Cursor and VS Code too).
 */
export const SKILL_DIRS = [".agents/skills/zoblocks", ".claude/skills/zoblocks"];

/** A skill file's path: SKILL.md or a reference beside it. Nothing that could leave the folder. */
const SKILL_FILE = /^(SKILL\.md|references\/[a-z0-9-]+\.md)$/;

export interface SkillBundle {
  schemaVersion: number;
  name: string;
  files: Array<{ path: string; content: string }>;
}

export class SkillError extends Error {}

export function parseSkillBundle(json: unknown): SkillBundle {
  const bundle = json as Partial<SkillBundle> | null;
  if (!bundle || bundle.schemaVersion !== 1 || !Array.isArray(bundle.files)) {
    throw new SkillError(
      `The skill at ${SKILL_URL} is not in a format this CLI reads. Update it: npx @zoblocks/cli@latest skill add`,
    );
  }
  for (const file of bundle.files) {
    if (
      typeof file?.path !== "string" ||
      !SKILL_FILE.test(file.path) ||
      typeof file.content !== "string"
    ) {
      throw new SkillError(
        `The skill bundle names a file this CLI will not write: ${String(file?.path)}`,
      );
    }
  }
  if (!bundle.files.some((f) => f.path === "SKILL.md")) {
    throw new SkillError("The skill bundle has no SKILL.md.");
  }
  return bundle as SkillBundle;
}

export interface SkillAddOptions {
  overwrite: boolean;
  dryRun: boolean;
}

export async function skillAdd(context: CommandContext, options: SkillAddOptions): Promise<number> {
  const { cwd, out, err } = context;
  const doFetch = context.fetchImpl ?? fetch;

  const response = await doFetch(SKILL_URL, { headers: { accept: "application/json" } });
  if (!response.ok) {
    err(`Could not fetch the skill — ${response.status} from ${SKILL_URL}`);
    return 1;
  }

  let bundle: SkillBundle;
  try {
    bundle = parseSkillBundle(await response.json());
  } catch (error) {
    err((error as Error).message);
    return 1;
  }

  let skipped = 0;
  for (const dir of SKILL_DIRS) {
    for (const file of bundle.files) {
      const relative = path.posix.join(dir, file.path);
      const absolute = path.join(cwd, relative);
      const existing = existsSync(absolute) ? await readFile(absolute, "utf8") : undefined;

      if (existing === file.content) {
        out(`  same   ${relative}`);
        continue;
      }
      if (existing !== undefined && !options.overwrite) {
        out(`  skip   ${relative} — changed here`);
        skipped++;
        continue;
      }
      if (options.dryRun) {
        out(`  would  ${relative}`);
        continue;
      }
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, "utf8");
      out(`  ${existing === undefined ? "write " : "update"} ${relative}`);
    }
  }

  out("");
  if (skipped) {
    out(
      `  ${skipped} file(s) differ from the published skill and were left alone. Pass --overwrite to replace them.`,
    );
    out("");
  }
  out("  .agents/skills is read by Codex, Cursor, VS Code, Gemini CLI, Windsurf and Roo Code;");
  out("  .claude/skills by Claude Code and Cline. Commit both so everyone on the project gets it.");
  out(
    "  For the facts the skill relies on, connect the MCP server: zoblocks mcp init --client <agent>",
  );
  return 0;
}
