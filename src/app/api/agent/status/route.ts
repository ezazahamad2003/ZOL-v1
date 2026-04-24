import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const runId = searchParams.get('runId')

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }

  // Verify run belongs to user's workspace
  const { data: run } = await supabase
    .from('agent_runs')
    .select('id, status, total_tool_calls, workspaces!inner(owner_id)')
    .eq('id', runId)
    .maybeSingle()

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Fetch steps
  const { data: steps } = await supabase
    .from('agent_steps')
    .select('*')
    .eq('run_id', runId)
    .order('step_number', { ascending: true })

  return NextResponse.json({
    status: run.status,
    totalToolCalls: run.total_tool_calls,
    steps: steps ?? [],
  })
}
