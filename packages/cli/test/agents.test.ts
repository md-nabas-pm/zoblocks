/**
 * `zoblocks mcp init` and `zoblocks skill add`, driven through `run()` against
 * a real temp directory — so what is asserted is the file that lands.
 *
 * The config shapes are pinned exactly. Each comes from that agent's own
 * documentation, and a small difference — `url` where Gemini wants `httpUrl`,
 * no `type` for Cline — is a server that silently never connects.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { run } from "../src/cli.js";
import { SKILL_URL, parseSkillBundle } from "../src/agent-commands.js";
import { REMOTE_URL } from "../src/agents.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "zoblocks-agents-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function zoblocks(argv: string[], fetchImpl?: typeof fetch) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run({
    argv: [...argv, "--cwd", dir],
    cwd: dir,
    env: {},
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    version: "0.0.0-test",
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

const json = async (file: string) => JSON.parse(await readFile(path.join(dir, file), "utf8"));
const text = (file: string) => readFile(path.join(dir, file), "utf8");

const LOCAL = { command: "npx", args: ["-y", "@zoblocks/mcp"] };

describe("zoblocks mcp init", () => {
  it("asks which agent, and lists them", async () => {
    const { code, err } = await zoblocks(["mcp", "init"]);
    expect(code).toBe(1);
    for (const id of [
      "claude",
      "codex",
      "cursor",
      "vscode",
      "roo",
      "gemini",
      "windsurf",
      "cline",
      "copilot",
    ]) {
      expect(err).toContain(id);
    }
  });

  it("refuses an agent it does not know", async () => {
    const { code, err } = await zoblocks(["mcp", "init", "--client", "notepad"]);
    expect(code).toBe(1);
    expect(err).toContain('Unknown agent "notepad"');
  });

  it("refuses an unknown mcp subcommand", async () => {
    expect((await zoblocks(["mcp", "add"])).code).toBe(1);
  });

  it.each([
    ["claude", ".mcp.json", { mcpServers: { zoblocks: { type: "http", url: REMOTE_URL } } }],
    ["cursor", ".cursor/mcp.json", { mcpServers: { zoblocks: { url: REMOTE_URL } } }],
    ["vscode", ".vscode/mcp.json", { servers: { zoblocks: { type: "http", url: REMOTE_URL } } }],
    [
      "roo",
      ".roo/mcp.json",
      { mcpServers: { zoblocks: { type: "streamable-http", url: REMOTE_URL } } },
    ],
    ["gemini", ".gemini/settings.json", { mcpServers: { zoblocks: { httpUrl: REMOTE_URL } } }],
  ])("writes %s's config in its own shape", async (client, file, expected) => {
    const { code, out } = await zoblocks(["mcp", "init", "--client", client]);
    expect(code).toBe(0);
    expect(out).toContain(`write  ${file}`);
    expect(await json(file)).toEqual(expected);
  });

  it.each([
    ["claude", ".mcp.json", "mcpServers", { type: "stdio", ...LOCAL }],
    ["cursor", ".cursor/mcp.json", "mcpServers", LOCAL],
    ["vscode", ".vscode/mcp.json", "servers", { type: "stdio", ...LOCAL }],
    ["gemini", ".gemini/settings.json", "mcpServers", LOCAL],
  ])("with --local, points %s at npx -y @zoblocks/mcp", async (client, file, container, entry) => {
    await zoblocks(["mcp", "init", "--client", client, "--local"]);
    expect((await json(file))[container].zoblocks).toEqual(entry);
  });

  it("accepts an agent's other name", async () => {
    await zoblocks(["mcp", "init", "--client", "claude-code"]);
    expect(existsSync(path.join(dir, ".mcp.json"))).toBe(true);
  });

  it("adds itself beside the servers already there, and keeps everything else", async () => {
    await writeFile(
      path.join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: { github: { type: "http", url: "https://example.org/mcp" } },
        other: 1,
      }),
    );
    const { out } = await zoblocks(["mcp", "init", "--client", "claude"]);
    expect(out).toContain("update .mcp.json");
    expect(await json(".mcp.json")).toEqual({
      mcpServers: {
        github: { type: "http", url: "https://example.org/mcp" },
        zoblocks: { type: "http", url: REMOTE_URL },
      },
      other: 1,
    });
  });

  it("does nothing on a second run", async () => {
    await zoblocks(["mcp", "init", "--client", "cursor"]);
    const before = await text(".cursor/mcp.json");
    const { code, out } = await zoblocks(["mcp", "init", "--client", "cursor"]);
    expect(code).toBe(0);
    expect(out).toContain("same   .cursor/mcp.json");
    expect(await text(".cursor/mcp.json")).toBe(before);
  });

  it("will not replace a different zoblocks entry without --force", async () => {
    await zoblocks(["mcp", "init", "--client", "cursor", "--local"]);
    const refused = await zoblocks(["mcp", "init", "--client", "cursor"]);
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("--force");
    expect((await json(".cursor/mcp.json")).mcpServers.zoblocks).toEqual(LOCAL);

    const forced = await zoblocks(["mcp", "init", "--client", "cursor", "--force"]);
    expect(forced.code).toBe(0);
    expect((await json(".cursor/mcp.json")).mcpServers.zoblocks).toEqual({ url: REMOTE_URL });
  });

  it("leaves a file with comments alone and prints the entry instead", async () => {
    await mkdir(path.join(dir, ".vscode"));
    const original = '{\n  // my servers\n  "servers": {}\n}\n';
    await writeFile(path.join(dir, ".vscode/mcp.json"), original);
    const { code, err } = await zoblocks(["mcp", "init", "--client", "vscode"]);
    expect(code).toBe(1);
    expect(err).toContain("not plain JSON");
    expect(err).toContain(REMOTE_URL);
    expect(await text(".vscode/mcp.json")).toBe(original);
  });

  it("writes nothing on --dry-run", async () => {
    const { code, out } = await zoblocks(["mcp", "init", "--client", "claude", "--dry-run"]);
    expect(code).toBe(0);
    expect(out).toContain("would .mcp.json");
    expect(await readdir(dir)).toEqual([]);
  });

  describe("Codex", () => {
    it("writes a TOML table", async () => {
      await zoblocks(["mcp", "init", "--client", "codex"]);
      expect(await text(".codex/config.toml")).toBe(
        `[mcp_servers.zoblocks]\nurl = "${REMOTE_URL}"\n`,
      );
    });

    it("writes the local command as TOML", async () => {
      await zoblocks(["mcp", "init", "--client", "codex", "--local"]);
      expect(await text(".codex/config.toml")).toBe(
        '[mcp_servers.zoblocks]\ncommand = "npx"\nargs = ["-y", "@zoblocks/mcp"]\n',
      );
    });

    it("keeps the rest of the file byte for byte", async () => {
      await mkdir(path.join(dir, ".codex"));
      const before = 'model = "gpt-5"\n\n[mcp_servers.github]\nurl = "https://example.org/mcp"\n';
      await writeFile(path.join(dir, ".codex/config.toml"), before);
      await zoblocks(["mcp", "init", "--client", "codex"]);
      expect(await text(".codex/config.toml")).toBe(
        `${before}\n[mcp_servers.zoblocks]\nurl = "${REMOTE_URL}"\n`,
      );
      expect((await zoblocks(["mcp", "init", "--client", "codex"])).out).toContain("same");
    });

    it("replaces only its own table with --force", async () => {
      await mkdir(path.join(dir, ".codex"));
      await writeFile(
        path.join(dir, ".codex/config.toml"),
        '[mcp_servers.zoblocks]\nurl = "https://old.example.org/mcp"\n\n[mcp_servers.github]\nurl = "https://example.org/mcp"\n',
      );
      expect((await zoblocks(["mcp", "init", "--client", "codex"])).code).toBe(1);
      await zoblocks(["mcp", "init", "--client", "codex", "--force"]);
      expect(await text(".codex/config.toml")).toBe(
        `[mcp_servers.zoblocks]\nurl = "${REMOTE_URL}"\n\n[mcp_servers.github]\nurl = "https://example.org/mcp"\n`,
      );
    });
  });

  it.each([
    ["windsurf", "serverUrl"],
    ["cline", "streamableHttp"],
    ["copilot", '"tools"'],
  ])("prints %s's entry and writes nothing in the project", async (client, marker) => {
    const { code, out } = await zoblocks(["mcp", "init", "--client", client]);
    expect(code).toBe(0);
    expect(out).toContain(marker);
    expect(out).toContain(REMOTE_URL);
    expect(await readdir(dir)).toEqual([]);
  });
});

describe("zoblocks skill add", () => {
  const bundle = {
    schemaVersion: 1,
    name: "zoblocks",
    files: [
      { path: "SKILL.md", content: "---\nname: zoblocks\n---\n# ZoBlocks\n" },
      { path: "references/components.md", content: "# Components\n" },
    ],
  };

  const serve = (body: unknown, status = 200) =>
    (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(SKILL_URL);
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;

  it("writes the skill where every agent reads it", async () => {
    const { code, out } = await zoblocks(["skill", "add"], serve(bundle));
    expect(code).toBe(0);
    for (const root of [".agents/skills/zoblocks", ".claude/skills/zoblocks"]) {
      expect(await text(`${root}/SKILL.md`)).toBe(bundle.files[0]!.content);
      expect(await text(`${root}/references/components.md`)).toBe("# Components\n");
      expect(out).toContain(`write  ${root}/SKILL.md`);
    }
  });

  it("does nothing on a second run", async () => {
    await zoblocks(["skill", "add"], serve(bundle));
    const { out } = await zoblocks(["skill", "add"], serve(bundle));
    expect(out).toContain("same   .agents/skills/zoblocks/SKILL.md");
    expect(out).not.toContain("write");
  });

  it("leaves a file changed in the project alone unless --overwrite", async () => {
    await zoblocks(["skill", "add"], serve(bundle));
    await writeFile(path.join(dir, ".claude/skills/zoblocks/SKILL.md"), "edited\n");

    const kept = await zoblocks(["skill", "add"], serve(bundle));
    expect(kept.out).toContain("skip   .claude/skills/zoblocks/SKILL.md");
    expect(kept.out).toContain("--overwrite");
    expect(await text(".claude/skills/zoblocks/SKILL.md")).toBe("edited\n");

    await zoblocks(["skill", "add", "--overwrite"], serve(bundle));
    expect(await text(".claude/skills/zoblocks/SKILL.md")).toBe(bundle.files[0]!.content);
  });

  it("writes nothing on --dry-run", async () => {
    await zoblocks(["skill", "add", "--dry-run"], serve(bundle));
    expect(await readdir(dir)).toEqual([]);
  });

  it("reports a failed download", async () => {
    const { code, err } = await zoblocks(["skill", "add"], serve({}, 404));
    expect(code).toBe(1);
    expect(err).toContain("404");
  });

  it.each([
    [
      "a path that leaves the folder",
      { ...bundle, files: [{ path: "../../.bashrc", content: "x" }] },
    ],
    ["an absolute path", { ...bundle, files: [{ path: "/etc/passwd", content: "x" }] }],
    ["no SKILL.md", { ...bundle, files: [{ path: "references/a.md", content: "x" }] }],
    ["a newer format", { ...bundle, schemaVersion: 2 }],
  ])("refuses a bundle with %s, and writes nothing", async (_, body) => {
    const { code } = await zoblocks(["skill", "add"], serve(body));
    expect(code).toBe(1);
    expect(await readdir(dir)).toEqual([]);
  });

  it("parses the bundle it is given, file by file", () => {
    expect(parseSkillBundle(bundle).files).toHaveLength(2);
  });
});
