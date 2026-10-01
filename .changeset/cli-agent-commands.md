---
"@zoblocks/cli": minor
---

Two commands for connecting coding agents to ZoBlocks.

`zoblocks mcp init --client <agent>` writes the ZoBlocks MCP server into the agent's project config, in that agent's own format — Claude Code, Codex, Cursor, VS Code, Roo Code and Gemini CLI — and prints the exact entry for Windsurf, Cline and the GitHub Copilot cloud agent, whose settings live outside the project. `--local` uses `npx -y @zoblocks/mcp` instead of the hosted server. Other servers in the file are kept; a different `zoblocks` entry is replaced only with `--force`.

`zoblocks skill add` installs the ZoBlocks coding skill into `.agents/skills/` and `.claude/skills/`, skipping files you have changed unless `--overwrite` is passed.

Still no runtime dependencies.
