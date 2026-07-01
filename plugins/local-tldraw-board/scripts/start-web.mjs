#!/usr/bin/env node
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serviceRoot = path.join(pluginRoot, 'assets', 'service')
const dataRoot = process.env.LOCAL_TLDRAW_DATA_DIR || path.join(os.homedir(), '.codex', 'local-tldraw-board')
const port = process.env.PORT || '4876'

for (const dir of [dataRoot, path.join(dataRoot, 'boards'), path.join(dataRoot, 'exports'), path.join(dataRoot, 'logs')]) {
  fs.mkdirSync(dir, { recursive: true })
}

if (!fs.existsSync(path.join(serviceRoot, 'node_modules'))) {
  const install = spawn('npm', ['install'], {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: process.env,
  })
  const code = await new Promise((resolve) => install.on('close', resolve))
  if (code !== 0) process.exit(code || 1)
}

const child = spawn('npm', ['run', 'dev'], {
  cwd: serviceRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    LOCAL_TLDRAW_DATA_DIR: dataRoot,
  },
})

child.on('close', (code) => process.exit(code || 0))

