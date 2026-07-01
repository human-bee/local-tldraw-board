# Cursor Setup

Local tldraw Board can be used in Cursor as a plugin or as a plain MCP server. The repo includes:

- a Cursor marketplace manifest at `.cursor-plugin/marketplace.json`
- a Cursor plugin manifest at `plugins/local-tldraw-board/.cursor-plugin/plugin.json`
- a Cursor MCP config at `plugins/local-tldraw-board/mcp.json`
- a Cursor rule at `plugins/local-tldraw-board/rules/local-tldraw-board.mdc`

## Local Plugin Install

Clone the repo, then symlink the plugin into Cursor's local plugin directory:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s /path/to/local-tldraw-board/plugins/local-tldraw-board ~/.cursor/plugins/local/local-tldraw-board
```

Restart Cursor or run `Developer: Reload Window`, then open Customize and confirm the plugin, rule, skill, and `local-tldraw` MCP server are available.

## Direct MCP Install

If you only want the MCP server, add this to a project `.cursor/mcp.json` or global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "local-tldraw": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/local-tldraw-board/plugins/local-tldraw-board/assets/service/server/mcp-server.mjs"
      ],
      "env": {
        "LOCAL_TLDRAW_URL": "http://127.0.0.1:4876"
      }
    }
  }
}
```

Replace `/path/to/local-tldraw-board` with the absolute path to your clone.

## First Run

From the plugin root:

```bash
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

In Cursor, open Customize and confirm `local-tldraw` is enabled. Ask Agent to check the `local-tldraw` status, list boards, or edit the open board.

## Publishing

Cursor marketplace plugins are reviewed by Cursor before public listing. This repo is structured so it can be tested locally now and submitted later.
