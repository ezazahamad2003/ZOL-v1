/**
 * Legacy endpoint: POST /api/agents/run
 * Used by the worker/Cloud Tasks to trigger intake agent after a call.
 * Kept for backwards compatibility with Cloud Tasks queue.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runIntakeAgent } from '@/agents/intake-agent'

export async function POST(req: NextRequest) {
  // This endpoint is called by the Cloud Tasks worker (not browser)
  // Basic auth via bearer token from env
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.WORKER_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { shopId?: string; workspaceId?: string; callId?: string }
  const workspaceId = body.workspaceId ?? body.shopId
  const { callId } = body

  if (!workspaceId || !callId) {
    return NextResponse.json({ error: 'Missing workspaceId or callId' }, { status: 400 })
  }

  try {
    const result = await runIntakeAgent(workspaceId, callId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent run failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
