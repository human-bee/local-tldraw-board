import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const baseUrl = process.env.LOCAL_TLDRAW_URL || 'http://127.0.0.1:4876'

const text = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error || `${response.status} ${response.statusText}`)
  }
  return body
}

const server = new McpServer({
  name: 'local-tldraw',
  version: '0.1.0',
})

server.registerTool(
  'status',
  {
    description: 'Show whether the local tldraw browser bridge is running and which boards have connected browser editors.',
    inputSchema: {},
  },
  async () => text(await request('/api/status'))
)

server.registerTool(
  'list_boards',
  {
    description: 'List locally persisted tldraw boards.',
    inputSchema: {},
  },
  async () => text(await request('/api/boards'))
)

server.registerTool(
  'snapshot',
  {
    description: 'Read a persisted tldraw board snapshot from disk.',
    inputSchema: {
      boardId: z.string().default('default'),
    },
  },
  async ({ boardId }) => text(await request(`/api/boards/${encodeURIComponent(boardId)}/snapshot`))
)

server.registerTool(
  'exec',
  {
    description:
      'Run JavaScript against a live local tldraw editor in the browser. Open the local board URL first. The code receives editor, getSnapshot, loadSnapshot, createShapeId, and helper functions.',
    inputSchema: {
      boardId: z.string().default('default'),
      code: z.string(),
      timeoutMs: z.number().int().min(1000).max(60000).default(20000),
    },
  },
  async ({ boardId, code, timeoutMs }) =>
    text(
      await request(`/api/boards/${encodeURIComponent(boardId)}/exec`, {
        method: 'POST',
        body: JSON.stringify({ code, timeoutMs }),
      })
    )
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
