import express from 'express'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataRoot = process.env.LOCAL_TLDRAW_DATA_DIR || path.join(os.homedir(), '.codex', 'local-tldraw-board')
const boardsDir = path.join(dataRoot, 'boards')
const exportsDir = path.join(dataRoot, 'exports')
const mediaDir = path.join(dataRoot, 'media')
const generatedImagesDir = process.env.LOCAL_TLDRAW_GENERATED_IMAGES_DIR || ''
const port = Number(process.env.PORT || 4876)

const app = express()
app.use(express.json({ limit: '50mb' }))
app.use('/media', express.static(mediaDir))
if (generatedImagesDir) {
  app.use('/generated-images', express.static(generatedImagesDir))
}

await fs.mkdir(boardsDir, { recursive: true })
await fs.mkdir(exportsDir, { recursive: true })
await fs.mkdir(mediaDir, { recursive: true })

const safeBoardId = (value) => {
  const id = String(value || 'default').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80)
  return id || 'default'
}

const boardPath = (boardId) => path.join(boardsDir, `${safeBoardId(boardId)}.json`)

const readBoard = async (boardId) => {
  const id = safeBoardId(boardId)
  try {
    const raw = await fs.readFile(boardPath(id), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      boardId: id,
      updatedAt: null,
      snapshot: null,
    }
  }
}

const writeBoard = async (boardId, snapshot) => {
  const id = safeBoardId(boardId)
  const payload = {
    boardId: id,
    updatedAt: new Date().toISOString(),
    snapshot,
  }
  await fs.writeFile(boardPath(id), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return payload
}

const clientsByBoard = new Map()
const pendingExecs = new Map()

const clientsForBoard = (boardId) => {
  const id = safeBoardId(boardId)
  if (!clientsByBoard.has(id)) clientsByBoard.set(id, new Set())
  return clientsByBoard.get(id)
}

app.get('/api/status', (_req, res) => {
  const boards = [...clientsByBoard.entries()].map(([boardId, clients]) => ({
    boardId,
    connectedClients: [...clients].filter((client) => client.readyState === client.OPEN).length,
  }))
  res.json({ ok: true, port, dataRoot, boardsDir, exportsDir, mediaDir, generatedImagesDir: generatedImagesDir || null, boards })
})

app.get('/api/boards', async (_req, res, next) => {
  try {
    const files = await fs.readdir(boardsDir)
    const boards = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const board = await readBoard(file.replace(/\.json$/, ''))
          return {
            boardId: board.boardId,
            updatedAt: board.updatedAt,
            hasSnapshot: Boolean(board.snapshot),
          }
        })
    )
    res.json({ boards })
  } catch (error) {
    next(error)
  }
})

app.get('/api/boards/:boardId/snapshot', async (req, res, next) => {
  try {
    res.json(await readBoard(req.params.boardId))
  } catch (error) {
    next(error)
  }
})

app.put('/api/boards/:boardId/snapshot', async (req, res, next) => {
  try {
    const board = await writeBoard(req.params.boardId, req.body.snapshot ?? null)
    res.json({ ok: true, boardId: board.boardId, updatedAt: board.updatedAt })
  } catch (error) {
    next(error)
  }
})

app.post('/api/exports/:fileName', async (req, res, next) => {
  try {
    const safeName = path.basename(String(req.params.fileName || 'export.bin')).replace(/[^a-zA-Z0-9._-]/g, '-')
    const base64 = String(req.body.base64 || '')
    if (!base64) {
      res.status(400).json({ ok: false, error: 'Missing base64 payload.' })
      return
    }
    const filePath = path.join(exportsDir, safeName)
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'))
    res.json({ ok: true, filePath, bytes: Buffer.byteLength(base64, 'base64') })
  } catch (error) {
    next(error)
  }
})

app.post('/api/boards/:boardId/exec', async (req, res, next) => {
  try {
    const boardId = safeBoardId(req.params.boardId)
    const clients = [...clientsForBoard(boardId)].filter((client) => client.readyState === client.OPEN)
    if (clients.length === 0) {
      res.status(409).json({
        ok: false,
        error: `No browser editor is connected for board "${boardId}". Open http://127.0.0.1:${port}/?board=${encodeURIComponent(boardId)} first.`,
      })
      return
    }

    const id = crypto.randomUUID()
    const timeoutMs = Math.min(Number(req.body.timeoutMs || 20_000), 60_000)
    const code = String(req.body.code || '')
    const target = clients[0]

    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingExecs.delete(id)
        resolve({ ok: false, error: `Timed out after ${timeoutMs}ms waiting for browser execution.` })
      }, timeoutMs)

      pendingExecs.set(id, (message) => {
        clearTimeout(timer)
        resolve(message)
      })

      target.send(JSON.stringify({ type: 'exec', id, code }))
    })

    res.status(result.ok ? 200 : 500).json(result)
  } catch (error) {
    next(error)
  }
})

const vite = await createViteServer({
  root,
  server: { middlewareMode: true, hmr: { port: port + 10_000 } },
  appType: 'spa',
})
app.use(vite.middlewares)

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const boardId = safeBoardId(url.searchParams.get('board') || 'default')
  const clients = clientsForBoard(boardId)
  clients.add(socket)

  socket.on('message', (data) => {
    let message
    try {
      message = JSON.parse(String(data))
    } catch {
      return
    }

    if (message.type === 'execResult' && pendingExecs.has(message.id)) {
      pendingExecs.get(message.id)(message)
      pendingExecs.delete(message.id)
    }
  })

  socket.on('close', () => {
    clients.delete(socket)
  })

  socket.send(JSON.stringify({ type: 'hello', boardId }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Local tldraw MCP board: http://127.0.0.1:${port}/?board=my-board`)
  console.log(`Local tldraw data: ${dataRoot}`)
  console.log(`Board snapshots: ${boardsDir}`)
})
