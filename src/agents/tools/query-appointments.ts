import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, QueryAppointmentsInput, QueryAppointmentsOutput, WorkspaceContext, ToolResult } from '../types'

export const queryAppointmentsTool: Tool<QueryAppointmentsInput, QueryAppointmentsOutput> = {
  name: 'query_appointments',
  description: 'Query appointments for the workspace. Filter by status, date range.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      status: { type: 'string', description: 'scheduled|completed|cancelled|no_show' },
      since: { type: 'string', description: 'ISO date string (start of range)' },
      until: { type: 'string', description: 'ISO date string (end of range)' },
      limit: { type: 'number', description: 'Max results (default 20)' },
    },
    required: ['workspaceId'],
  },

  async execute(input: QueryAppointmentsInput, _ctx: WorkspaceContext): Promise<ToolResult<QueryAppointmentsOutput>> {
    const admin = createAdminClient()
    let query = admin
      .from('appointments')
      .select('id, customer_name, customer_phone, service_type, scheduled_at, status, duration_minutes')
      .eq('workspace_id', input.workspaceId)
      .order('scheduled_at', { ascending: true })
      .limit(input.limit ?? 20)

    if (input.status) query = query.eq('status', input.status)
    if (input.since) query = query.gte('scheduled_at', input.since)
    if (input.until) query = query.lte('scheduled_at', input.until)

    const { data, error } = await query

    if (error) return { status: 'error', output: { appointments: [] }, error: error.message }

    return {
      status: 'success',
      output: {
        appointments: (data ?? []).map((a) => ({
          id: a.id,
          customer_name: a.customer_name,
          customer_phone: a.customer_phone,
          service_type: a.service_type,
          scheduled_at: a.scheduled_at,
          status: a.status,
          duration_minutes: a.duration_minutes,
        })),
      },
    }
  },
}
