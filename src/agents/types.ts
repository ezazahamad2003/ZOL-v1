import type { BusinessHours, VehicleInfo } from '@/lib/supabase/types'

// ─── Tool contract ────────────────────────────────────────────────────────────

export type ToolStatus = 'success' | 'error'

export interface ToolResult<O> {
  status: ToolStatus
  output: O
  error?: string
}

export interface Tool<I, O> {
  name: string
  description: string
  inputSchema: Record<string, unknown>  // JSON Schema
  execute(input: I, ctx: WorkspaceContext): Promise<ToolResult<O>>
}

// ─── Workspace context (injected into every agent run) ────────────────────────

export interface GoogleTokens {
  accessToken?: string
  refreshToken?: string
}

export interface CallWithTranscript {
  id: string
  vapi_call_id: string | null
  transcript: unknown
  caller_phone: string | null
  caller_name: string | null
  status: string
  created_at: string
}

export interface WorkspaceContext {
  workspaceId: string
  workspaceName: string
  businessHours: BusinessHours
  currentCall?: CallWithTranscript
  googleTokens: GoogleTokens
}

// ─── Orchestrator result ──────────────────────────────────────────────────────

export interface OrchestratorResult {
  status: 'completed' | 'failed'
  totalToolCalls: number
  result: unknown
  error?: string
}

// ─── Tool I/O types ───────────────────────────────────────────────────────────

export interface QueryCallsInput {
  workspaceId: string
  limit?: number
  status?: string
  since?: string  // ISO date
}

export interface QueryCallsOutput {
  calls: Array<{
    id: string
    caller_name: string | null
    caller_phone: string | null
    summary: string | null
    sentiment: string | null
    status: string
    created_at: string
    duration_seconds: number | null
  }>
}

export interface GetCallTranscriptInput {
  callId: string
}

export interface GetCallTranscriptOutput {
  callId: string
  transcript: unknown
  summary: string | null
  action_items: unknown
}

export interface QueryAppointmentsInput {
  workspaceId: string
  status?: string
  since?: string
  until?: string
  limit?: number
}

export interface QueryAppointmentsOutput {
  appointments: Array<{
    id: string
    customer_name: string | null
    customer_phone: string | null
    service_type: string | null
    scheduled_at: string
    status: string
    duration_minutes: number
  }>
}

export interface BookAppointmentInput {
  workspaceId: string
  callId?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  vehicleInfo?: VehicleInfo
  serviceType: string
  scheduledAt: string  // ISO 8601
  durationMinutes?: number
}

export interface BookAppointmentOutput {
  appointmentId: string
  googleEventId: string | null
}

export interface CancelAppointmentInput {
  appointmentId: string
  reason?: string
}

export interface CancelAppointmentOutput {
  success: boolean
}

export interface CheckAvailabilityInput {
  workspaceId: string
  date: string  // YYYY-MM-DD
  durationMinutes?: number
}

export interface CheckAvailabilityOutput {
  available: boolean
  slots: string[]  // ISO datetime strings
}

export interface SendEmailInput {
  workspaceId: string
  toEmail: string
  subject: string
  bodyHtml: string
  callId?: string
}

export interface SendEmailOutput {
  emailId: string
  gmailMessageId: string | null
  sentAt: string
}

export interface DraftEmailInput {
  workspaceId: string
  toEmail: string
  subject: string
  bodyHtml: string
  callId?: string
}

export interface DraftEmailOutput {
  emailId: string
}

export interface QueryFollowUpsInput {
  workspaceId: string
  status?: string
  limit?: number
}

export interface QueryFollowUpsOutput {
  followUps: Array<{
    id: string
    customer_phone: string | null
    customer_email: string | null
    follow_up_number: number
    scheduled_for: string
    status: string
    sent_at: string | null
  }>
}

export interface TriggerFollowUpInput {
  workspaceId: string
  callId: string
  customerPhone?: string
  customerEmail?: string
  followUpNumber?: number
  scheduledFor?: string
}

export interface TriggerFollowUpOutput {
  followUpId: string
  emailId: string | null
}

export interface GetInsightsInput {
  workspaceId: string
  insightType?: string
  urgency?: string
  limit?: number
}

export interface GetInsightsOutput {
  insights: Array<{
    id: string
    call_id: string
    insight_type: string
    content: string
    urgency: string
    created_at: string
  }>
  summary: {
    total: number
    byType: Record<string, number>
    byUrgency: Record<string, number>
  }
}
