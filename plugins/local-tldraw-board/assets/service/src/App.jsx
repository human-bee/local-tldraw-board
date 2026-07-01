import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  DefaultColorStyle,
  Tldraw,
  createShapeId,
  getSnapshot,
  loadSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './styles.css'

const boardIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('board') || 'default'
}

const serializeResult = (value) => {
  if (value == null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function LocalTldrawApp() {
  const boardId = useMemo(boardIdFromUrl, [])
  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)
  const socketRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [savedAt, setSavedAt] = useState(null)

  const saveSnapshot = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const snapshot = getSnapshot(editor.store)
    const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/snapshot`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ snapshot }),
    })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json()
    setSavedAt(result.updatedAt)
  }, [boardId])

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveSnapshot().catch((error) => {
        console.error(error)
        setStatus('save failed')
      })
    }, 500)
  }, [saveSnapshot])

  const runCode = useCallback(
    async (code) => {
      const editor = editorRef.current
      if (!editor) throw new Error('Editor is not ready yet.')

      const helpers = {
        createShapeId,
        DefaultColorStyle,
        getSnapshot: () => getSnapshot(editor.store),
        loadSnapshot: (snapshot) => loadSnapshot(editor.store, snapshot),
        saveSnapshot,
        selectAll: () => editor.selectAll(),
        zoomToContent: () => {
          const bounds = editor.getCurrentPageBounds()
          if (bounds) editor.zoomToBounds(bounds, { animation: { duration: 220 } })
        },
      }

      const fn = new Function(
        'editor',
        'helpers',
        `"use strict"; const { createShapeId, DefaultColorStyle, getSnapshot, loadSnapshot, saveSnapshot, selectAll, zoomToContent } = helpers; return (async () => { ${code} })();`
      )
      const result = await fn(editor, helpers)
      scheduleSave()
      return serializeResult(result)
    },
    [saveSnapshot, scheduleSave]
  )

  const handleMount = useCallback(
    (editor) => {
      editorRef.current = editor
      window.localTldrawEditor = editor

      ;(async () => {
        const response = await fetch(`/api/boards/${encodeURIComponent(boardId)}/snapshot`)
        const board = await response.json()
        if (board.snapshot) {
          loadSnapshot(editor.store, board.snapshot)
          setSavedAt(board.updatedAt)
        }

        editor.store.listen(
          () => {
            scheduleSave()
          },
          { source: 'user', scope: 'document' }
        )

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws?board=${encodeURIComponent(boardId)}`)
        socketRef.current = socket

        socket.addEventListener('open', () => setStatus('connected'))
        socket.addEventListener('close', () => setStatus('disconnected'))
        socket.addEventListener('message', async (event) => {
          const message = JSON.parse(event.data)
          if (message.type !== 'exec') return
          try {
            const result = await runCode(message.code)
            socket.send(JSON.stringify({ type: 'execResult', id: message.id, ok: true, result }))
          } catch (error) {
            socket.send(
              JSON.stringify({
                type: 'execResult',
                id: message.id,
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              })
            )
          }
        })
      })().catch((error) => {
        console.error(error)
        setStatus('load failed')
      })
    },
    [boardId, runCode, scheduleSave]
  )

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimerRef.current)
      socketRef.current?.close()
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <strong>Local tldraw MCP</strong>
          <span>{boardId}</span>
        </div>
        <div className="status">
          <span>{status}</span>
          {savedAt ? <span>saved {new Date(savedAt).toLocaleTimeString()}</span> : <span>unsaved</span>}
        </div>
      </div>
      <div className="canvas-wrap">
        <Tldraw onMount={handleMount} persistenceKey={undefined} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<LocalTldrawApp />)
