---
name: local-tldraw-board
description: Use persistent local tldraw boards from Codex through the local-tldraw MCP bridge. Trigger when users ask to create, open, inspect, arrange, edit, screenshot, or export durable tldraw boards, visual design boards, image mockup boards, or local whiteboards controlled by Codex.
---

# Local tldraw Board

Use this skill to work with persistent tldraw boards backed by a localhost web editor and the `local-tldraw` MCP server.

## Model

- The browser UI runs at `http://127.0.0.1:4876/?board=<board-id>`.
- Board data lives under `~/.codex/local-tldraw-board/boards`.
- Local media assets live under `~/.codex/local-tldraw-board/media`.
- Exports live under `~/.codex/local-tldraw-board/exports`.
- MCP tool calls operate through the live browser editor. Open the target board in the browser before using `exec`.

## Setup

From the installed plugin root:

```bash
node scripts/setup.mjs
```

To run the web bridge for the current session:

```bash
node scripts/start-web.mjs
```

To keep the board service running across macOS restarts:

```bash
node scripts/install-launch-agent.mjs
```

To check service health:

```bash
node scripts/healthcheck.mjs
```

To migrate non-portable generated image references into persistent media storage:

```bash
node scripts/migrate-media.mjs
```

To open a board:

```bash
node scripts/open-board.mjs my-board
```

## MCP Workflow

1. Confirm the web bridge is healthy with `local-tldraw.status`.
2. Open the board URL in the in-app browser if no browser client is connected.
3. Use `local-tldraw.exec` for visual edits. Keep code idempotent when possible.
4. Call `saveSnapshot()` or rely on autosave after edits.
5. Use browser screenshots for visual verification.

`exec` code receives:

- `editor`
- `createShapeId`
- `DefaultColorStyle`
- `getSnapshot()`
- `loadSnapshot(snapshot)`
- `saveSnapshot()`
- `selectAll()`
- `zoomToContent()`

## Recovery

- `ERR_CONNECTION_REFUSED`: run `node scripts/start-web.mjs` or install/restart the LaunchAgent.
- `No browser editor is connected`: open the board URL first.
- Blank or missing images after restart: run `node scripts/migrate-media.mjs`, restart the web bridge, and reload the board.
- Stale plugin metadata: reinstall or refresh the plugin in Codex, then start a new thread.
- Missing dependencies after moving machines: rerun `node scripts/setup.mjs`.

## Guardrails

- Do not store secrets on boards.
- Do not edit plugin source to store board data. Keep mutable board snapshots under `~/.codex/local-tldraw-board`.
- Do not commit generated board exports unless the user explicitly asks.
