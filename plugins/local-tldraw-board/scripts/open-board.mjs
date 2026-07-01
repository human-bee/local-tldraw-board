#!/usr/bin/env node
import { spawn } from 'node:child_process'

const board = process.argv[2] || 'default'
const port = process.env.PORT || '4876'
const url = `http://127.0.0.1:${port}/?board=${encodeURIComponent(board)}`

console.log(url)
spawn('open', [url], { stdio: 'ignore', detached: true }).unref()

