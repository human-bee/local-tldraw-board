#!/usr/bin/env node
const port = process.env.PORT || '4876'
const url = `http://127.0.0.1:${port}/api/status`

try {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok || !body.ok) {
    console.error(body)
    process.exit(1)
  }
  console.log(JSON.stringify(body, null, 2))
} catch (error) {
  console.error(`Local tldraw board is not reachable at ${url}`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

