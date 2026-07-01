#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataRoot = process.env.LOCAL_TLDRAW_DATA_DIR || path.join(os.homedir(), '.codex', 'local-tldraw-board')
const boardsDir = path.join(dataRoot, 'boards')
const mediaDir = path.join(dataRoot, 'media')
const sourceDirs = process.argv.slice(2).map((value) => path.resolve(value))
if (sourceDirs.length === 0) {
  sourceDirs.push(path.join(os.homedir(), '.codex', 'generated_images'))
  sourceDirs.push(path.join(pluginRoot, 'assets'))
}

const isReadableDir = (dir) => {
  try {
    return fs.statSync(dir).isDirectory()
  } catch {
    return false
  }
}

const walkFiles = async (dir, files = []) => {
  if (!isReadableDir(dir)) return files
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

const sourceFiles = []
for (const dir of sourceDirs) {
  await walkFiles(dir, sourceFiles)
}

const sourceByName = new Map()
for (const file of sourceFiles) {
  if (!sourceByName.has(path.basename(file))) {
    sourceByName.set(path.basename(file), file)
  }
}

await fsp.mkdir(mediaDir, { recursive: true })
const boardFiles = (await fsp.readdir(boardsDir).catch(() => [])).filter((file) => file.endsWith('.json'))
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
let copied = 0
let changedBoards = 0
let rewrittenRefs = 0
const missing = new Set()

for (const file of boardFiles) {
  const boardPath = path.join(boardsDir, file)
  let raw = await fsp.readFile(boardPath, 'utf8')
  const matches = [...raw.matchAll(/\/generated-images\/([^"\s?]+)/g)]
  if (matches.length === 0) continue

  let next = raw
  for (const match of matches) {
    const fileName = decodeURIComponent(match[1])
    const source = sourceByName.get(fileName)
    if (!source) {
      missing.add(fileName)
      continue
    }

    const dest = path.join(mediaDir, fileName)
    if (!fs.existsSync(dest)) {
      await fsp.copyFile(source, dest)
      copied += 1
    }

    const from = `/generated-images/${match[1]}`
    const to = `/media/${encodeURIComponent(fileName).replaceAll('%2F', '/')}`
    const before = next
    next = next.split(from).join(to)
    if (next !== before) rewrittenRefs += 1
  }

  if (next !== raw) {
    await fsp.copyFile(boardPath, `${boardPath}.bak-${timestamp}`)
    await fsp.writeFile(boardPath, next, 'utf8')
    changedBoards += 1
  }
}

console.log(JSON.stringify({
  dataRoot,
  boardsDir,
  mediaDir,
  sourceDirs,
  changedBoards,
  copied,
  rewrittenRefs,
  missing: [...missing].sort(),
}, null, 2))
