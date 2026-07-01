#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serviceRoot = path.join(pluginRoot, 'assets', 'service')
const dataRoot = process.env.LOCAL_TLDRAW_DATA_DIR || path.join(os.homedir(), '.codex', 'local-tldraw-board')

for (const dir of [dataRoot, path.join(dataRoot, 'boards'), path.join(dataRoot, 'exports'), path.join(dataRoot, 'logs')]) {
  fs.mkdirSync(dir, { recursive: true })
}

const result = spawnSync('npm', ['install'], {
  cwd: serviceRoot,
  stdio: 'inherit',
  env: process.env,
})

if (result.status !== 0) {
  process.exit(result.status || 1)
}

console.log(`Local tldraw service ready: ${serviceRoot}`)
console.log(`Board data directory: ${dataRoot}`)

