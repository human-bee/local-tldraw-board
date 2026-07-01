# Claude Code Setup

Local tldraw Board can be installed as a Claude Code plugin marketplace. The plugin bundles:

- a Claude plugin manifest at `.claude-plugin/plugin.json`
- the existing agent skill under `skills/`
- a Claude-specific MCP config at `.claude-mcp.json`

## Install

In Claude Code, add the public marketplace:

```text
/plugin marketplace add human-bee/local-tldraw-board
```

Then install the plugin:

```text
/plugin install local-tldraw-board@local-tldraw-board
```

CLI equivalent:

```bash
claude plugin marketplace add human-bee/local-tldraw-board --sparse .claude-plugin plugins/local-tldraw-board
claude plugin install local-tldraw-board@local-tldraw-board
```

## First Run

The plugin metadata makes the skill and MCP server available, but the local tldraw web bridge still needs Node dependencies and a running browser page.

From a checkout of this repo:

```bash
git clone https://github.com/human-bee/local-tldraw-board
cd local-tldraw-board/plugins/local-tldraw-board
node scripts/setup.mjs
node scripts/start-web.mjs
```

Then open:

```text
http://127.0.0.1:4876/?board=my-board
```

For a persistent macOS service:

```bash
node scripts/install-launch-agent.mjs
node scripts/open-board.mjs my-board
```

## Verify

In Claude Code:

```text
/mcp
```

Confirm `local-tldraw` is listed, then ask Claude to check `local-tldraw.status` or open/edit a board.

## Notes

- Claude Code copies marketplace plugins into its plugin cache. Keep scripts and assets self-contained inside `plugins/local-tldraw-board`.
- Board snapshots, media, and exports stay local under `~/.codex/local-tldraw-board` by default.
- If the MCP server starts before dependencies are installed, run `node scripts/setup.mjs` and restart Claude Code.
