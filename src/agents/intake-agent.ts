/**
 * Intake agent — runs after a call ends.
 *
 * Flow:
 * 1. Extract caller info, vehicle, sentiment, summary, action items from transcript
 * 2. Detect pain points → insert into call_insights
 * 3. If appointment requested → create in appointments + Google Calendar
 * 4. If follow-up needed → create emails + follow_ups records
 * 5. Log all steps to agent_steps via orchestrator
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { runOrchestrator } from './orchestrator'
import { queryCallsTool } from './tools/query-calls'
import { getCallTranscriptTool } from './tools/get-call-transcript'
import { queryAppointmentsTool } from './tools/query-appointments'
import { bookAppointmentTool } from './tools/book-appointment'
import { cancelAppointmentTool } from './tools/cancel-appointment'
import { checkAvailabilityTool } from './tools/check-availability'
import { sendEmailTool } from './tools/send-email'
import { draftEmailTool } from './tools/draft-email'
import { queryFollowUpsTool } from './tools/query-follow-ups'
import { triggerFollowUpTool } from './tools/trigger-follow-up'
import { getInsightsTool } from './tools/get-insights'
import type { WorkspaceContext, OrchestratorResult } from './types'
import type { BusinessHours, VehicleInfo, Json } from '@/lib/supabase/types'
import { decrypt } from '@/lib/crypto/encrypt'

// ─── Structured extraction from transcript ────────────────────────────────────

interface CallExtraction {
  callerName: string | null
  callerPhone: string | null
  callerEmail: string | null
  vehicleInfo: VehicleInfo | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | null
  actionItems: string[]
  appointmentRequested: boolean
  appointmentDate: string | null     // ISO date hint from conversation
  followUpNeeded: boolean
  painPoints: Array<{ content: string; urgency: 'low' | 'medium' | 'high' | 'emergency' }>
  serviceRequests: Array<{ content: string; urgency: 'low' | 'medium' | 'high' | 'emergency' }>
}

async function extractCallData(transcript: unknown, workspaceName: string): Promise<CallExtraction> {
  const anthropic = getAnthropicClient()

  const transcriptText = typeof transcript === 'string'
    ? transcript
    : JSON.stringify(transcript)

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: `You are a data extraction assistant for ${workspaceName} mechanic shop.
Extract structured information from call transcripts. Return ONLY valid JSON — no markdown.`,
    messages: [
      {
        role: 'user',
        content: `Transcript:\n${transcriptText}\n\nReturn JSON with this exact shape:
{
  "callerName": string | null,
  "callerPhone": string | null,
  "callerEmail": string | null,
  "vehicleInfo": { "make": string | null, "model": string | null, "year": number | null, "plate": string | null } | null,
  "summary": string | null,
  "sentiment": "positive" | "neutral" | "negative" | "frustrated" | null,
  "actionItems": string[],
  "appointmentRequested": boolean,
  "appointmentDate": string | null,
  "followUpNeeded": boolean,
  "painPoints": [{ "content": string, "urgency": "low" | "medium" | "high" | "emergency" }],
  "serviceRequests": [{ "content": string, "urgency": "low" | "medium" | "high" | "emergency" }]
}`,
      },
    ],
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  const raw = textBlock?.text ?? '{}'

  try {
    return JSON.parse(raw) as CallExtraction
  } catch {
    return {
      callerName: null, callerPhone: null, callerEmail: null, vehicleInfo: null,
      summary: null, sentiment: null, actionItems: [], appointmentRequested: false,
      appointmentDate: null, followUpNeeded: false, painPoints: [], serviceRequests: [],
    }
  }
}

// ─── Build workspace context ──────────────────────────────────────────────────

async function buildWorkspaceContext(workspaceId: string, callId: string): Promise<WorkspaceContext> {
  const admin = createAdminClient()

  const [workspaceRes, callRes, integrationRes] = await Promise.all([
    admin.from('workspaces').select('*').eq('id', workspaceId).single(),
    admin.from('calls').select('*').eq('id', callId).single(),
    admin
      .from('integrations')
      .select('provider, access_token, refresh_token')
      .eq('workspace_id', workspaceId)
      .in('provider', ['google_calendar', 'gmail'])
      .eq('status', 'connected'),
  ])

  if (workspaceRes.error || !workspaceRes.data) {
    throw new Error(`Workspace ${workspaceId} not found`)
  }

  const workspace = workspaceRes.data
  let googleTokens: { accessToken?: string; refreshToken?: string } = {}

  const calendarIntegration = integrationRes.data?.find((i) => i.provider === 'google_calendar')
  if (calendarIntegration?.refresh_token) {
    try {
      googleTokens = { refreshToken: decrypt(calendarIntegration.refresh_token) }
    } catch {
      // Encryption key may not be configured
    }
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    businessHours: (workspace.business_hours as BusinessHours) ?? {},
    currentCall: callRes.data
      ? {
          id: callRes.data.id,
          vapi_call_id: callRes.data.vapi_call_id,
          transcript: callRes.data.transcript,
          caller_phone: callRes.data.caller_phone,
          caller_name: callRes.data.caller_name,
          status: callRes.data.status,
          created_at: callRes.data.created_at,
        }
      : undefined,
    googleTokens,
  }
}

// ─── Main intake agent ────────────────────────────────────────────────────────

export async function runIntakeAgent(
  workspaceId: string,
  callId: string
): Promise<OrchestratorResult> {
  const admin = createAdminClient()

  // Create agent_run record
  const { data: runRecord, error: runErr } = await admin
    .from('agent_runs')
    .insert({
      workspace_id: workspaceId,
      trigger_type: 'call',
      trigger_ref: callId,
      user_prompt: `Process completed call ${callId} — extract details, log insights, schedule follow-ups`,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (runErr || !runRecord) {
    throw new Error(`Failed to create agent run: ${runErr?.message}`)
  }

  // Fetch call transcript
  const { data: callData } = await admin
    .from('calls')
    .select('transcript, caller_phone')
    .eq('id', callId)
    .single()

  const transcript = callData?.transcript

  // Step 1: Extract structured data from transcript
  const ctx = await buildWorkspaceContext(workspaceId, callId)
  const extraction = await extractCallData(transcript, ctx.workspaceName)

  // Step 2: Update call with extracted info
  await admin
    .from('calls')
    .update({
      caller_name: extraction.callerName,
      caller_phone: extraction.callerPhone ?? callData?.caller_phone,
      caller_email: extraction.callerEmail,
      vehicle_info: (extraction.vehicleInfo ?? null) as Json,
      summary: extraction.summary,
      sentiment: extraction.sentiment,
      action_items: (extraction.actionItems.length > 0 ? extraction.actionItems : null) as Json,
    })
    .eq('id', callId)

  // Step 3: Insert call insights
  const insights: Array<{ call_id: string; insight_type: string; content: string; urgency: string }> = [
    ...extraction.painPoints.map((p) => ({
      call_id: callId,
      insight_type: 'pain_point',
      content: p.content,
      urgency: p.urgency,
    })),
    ...extraction.serviceRequests.map((s) => ({
      call_id: callId,
      insight_type: 'service_request',
      content: s.content,
      urgency: s.urgency,
    })),
  ]

  if (insights.length > 0) {
    await admin.from('call_insights').insert(insights)
  }

  // Build user prompt for orchestrator based on extraction results
  const orchestratorPrompt = buildOrchestratorPrompt(
    workspaceId, callId, extraction, ctx.workspaceName
  )

  // Step 4: Run orchestrator for appointment/follow-up tasks
  return runOrchestrator({
    runId: runRecord.id,
    ctx,
    userPrompt: orchestratorPrompt,
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
  })
}

function buildOrchestratorPrompt(
  workspaceId: string,
  callId: string,
  extraction: CallExtraction,
  workspaceName: string
): string {
  const parts = [
    `A call has just completed at ${workspaceName} (workspace: ${workspaceId}, call: ${callId}).`,
    `Caller: ${extraction.callerName ?? 'Unknown'}, Phone: ${extraction.callerPhone ?? 'Unknown'}, Email: ${extraction.callerEmail ?? 'Unknown'}`,
    `Summary: ${extraction.summary ?? 'No summary'}`,
    `Sentiment: ${extraction.sentiment ?? 'unknown'}`,
  ]

  if (extraction.appointmentRequested) {
    parts.push(
      `The caller requested an appointment${extraction.appointmentDate ? ` around ${extraction.appointmentDate}` : ''}.`,
      `Please check availability and book an appointment if possible.`
    )
  }

  if (extraction.followUpNeeded) {
    parts.push(
      `A follow-up is needed for this caller.`,
      `Please trigger a follow-up for this call.`
    )
  }

  if (!extraction.appointmentRequested && !extraction.followUpNeeded) {
    parts.push('No immediate actions are needed. Acknowledge the call was processed.')
  }

  return parts.join('\n')
}
