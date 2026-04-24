/**
 * Cloud Run entrypoint for the ZOL agent worker.
 * Receives Cloud Tasks HTTP requests and processes agent jobs.
 *
 * Cloud Tasks sends: POST /handle with JSON body { workspaceId, callId, triggerType }
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { handleAgentJob, type WorkerPayload } from './handler'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/handle') {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  let body: string
  try {
    body = await readBody(req)
  } catch {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Failed to read request body' }))
    return
  }

  let payload: WorkerPayload
  try {
    payload = JSON.parse(body) as WorkerPayload
  } catch {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  if (!payload.workspaceId || !payload.callId || !payload.triggerType) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Missing required fields: workspaceId, callId, triggerType' }))
    return
  }

  // Return 200 immediately — Cloud Tasks requires fast ack
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))

  // Process asynchronously after ack
  handleAgentJob(payload).catch((err) => {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Agent worker: unhandled error',
      error: err instanceof Error ? err.message : String(err),
      workspaceId: payload.workspaceId,
      callId: payload.callId,
    }))
  })
})

server.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `ZOL agent worker listening on port ${PORT}`,
  }))
})
