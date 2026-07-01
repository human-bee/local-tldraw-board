#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataRoot = process.env.LOCAL_TLDRAW_DATA_DIR || path.join(os.homedir(), '.codex', 'local-tldraw-board')
const logsDir = path.join(dataRoot, 'logs')
const label = 'com.codex.local-tldraw-board'
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`)
const nodePath =
  process.execPath ||
  spawnSync('/usr/bin/env', ['which', 'node'], { encoding: 'utf8' }).stdout.trim() ||
  '/opt/homebrew/bin/node'

fs.mkdirSync(logsDir, { recursive: true })
fs.mkdirSync(path.dirname(plistPath), { recursive: true })

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${path.join(pluginRoot, 'scripts', 'start-web.mjs')}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${pluginRoot}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(logsDir, 'launchd.out.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(logsDir, 'launchd.err.log')}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${[
      path.dirname(nodePath),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ].join(':')}</string>
  </dict>
</dict>
</plist>
`

fs.writeFileSync(plistPath, plist)

const domain = `gui/${process.getuid()}`
spawnSync('launchctl', ['bootout', domain, plistPath], { stdio: 'ignore' })
const bootstrap = spawnSync('launchctl', ['bootstrap', domain, plistPath], { stdio: 'inherit' })
if (bootstrap.status !== 0) process.exit(bootstrap.status || 1)
spawnSync('launchctl', ['kickstart', '-k', `${domain}/${label}`], { stdio: 'inherit' })

console.log(`Installed LaunchAgent: ${plistPath}`)
console.log(`Logs: ${logsDir}`)
