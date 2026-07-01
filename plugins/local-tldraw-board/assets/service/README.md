# Local tldraw Service

This folder contains the localhost tldraw app and MCP bridge used by the Codex plugin.

## Run

From the plugin root:

```bash
node scripts/setup.mjs
node scripts/start-web.mjs
```

Open a board:

```text
http://127.0.0.1:4876/?board=my-board
```

Board snapshots are saved under `~/.codex/local-tldraw-board/boards`.

## MCP

The plugin registers the `local-tldraw` stdio server through `.mcp.json`.

The web server must be running before `exec` can touch a board. The browser page must also be open for the target board because `exec` runs against the real browser editor.

## Tool Model

- `status`: checks whether the web bridge is running and which boards have connected browser editors.
- `list_boards`: lists persisted board files.
- `snapshot`: reads a saved snapshot.
- `exec`: runs JavaScript against the live tldraw editor in the browser.

Example `exec` code:

```js
const id = createShapeId('hello')
editor.createShape({
  id,
  type: 'text',
  x: 120,
  y: 120,
  props: {
    text: 'Hello from MCP',
    color: 'blue',
    size: 'xl',
    font: 'draw',
    w: 400,
    autoSize: true,
    scale: 1,
    richText: undefined,
  },
})
editor.select(id)
zoomToContent()
return editor.getCurrentPageShapes().length
```
