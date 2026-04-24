import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runOrchestrator } from '@/agents/orchestrator'
import { queryCallsTool } from '@/agents/tools/query-calls'
import { getCallTranscriptTool } from '@/agents/tools/get-call-transcript'
import { queryAppointmentsTool } from '@/agents/tools/query-appointments'
import { bookAppointmentTool } from '@/agents/tools/book-appointment'
import { cancelAppointmentTool } from '@/agents/tools/cancel-appointment'
import { checkAvailabilityTool } from '@/agents/tools/check-availability'
import { sendEmailTool } from '@/agents/tools/send-email'
import { draftEmailTool } from '@/agents/tools/draft-email'
import { queryFollowUpsTool } from '@/agents/tools/query-follow-ups'
import { triggerFollowUpTool } from '@/agents/tools/trigger-follow-up'
import { getInsightsTool } from '@/agents/tools/get-insights'
import type { WorkspaceContext, } from '@/agents/types'
import type { BusinessHours } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { workspaceId?: string; userPrompt?: string }

  if (!body.workspaceId || !body.userPrompt) {
    return NextResponse.json({ error: 'Missing workspaceId or userPrompt' }, { status: 400 })
  }

  // Verify ownership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, business_hours')
    .eq('id', body.workspaceId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const admin = createAdminClient()

  // Create agent_run record
  const { data: runRecord, error: runErr } = await admin
    .from('agent_runs')
    .insert({
      workspace_id: workspace.id,
      trigger_type: 'manual',
      user_prompt: body.userPrompt,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (runErr || !runRecord) {
    return NextResponse.json({ error: 'Failed to create agent run' }, { status: 500 })
  }

  const ctx: WorkspaceContext = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    businessHours: (workspace.business_hours as BusinessHours) ?? {},
    googleTokens: {},
  }

  // Run in background (don't await — return runId immediately)
  runOrchestrator({
    runId: runRecord.id,
    ctx,
    userPrompt: body.userPrompt,
    tools: [
      queryCallsTool,
      getCallTranscriptTool,
      queryAppointmentsTool,
      bookAppointmentTool,
      cancelAppointmentTool,
      checkAvailabilityTool,
      sendEmailTool,
      draftEmailTool,
      queryFollowUpsTool,
      triggerFollowUpTool,
      getInsightsTool,
    ],
  }).catch((err) => {
    console.error('[agent/run] Orchestrator error:', err)
  })

  return NextResponse.json({ runId: runRecord.id })
}
