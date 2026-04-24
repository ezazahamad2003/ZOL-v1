import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, QueryFollowUpsInput, QueryFollowUpsOutput, WorkspaceContext, ToolResult } from '../types'

export const queryFollowUpsTool: Tool<QueryFollowUpsInput, QueryFollowUpsOutput> = {
  name: 'query_follow_ups',
  description: 'Query follow-ups for the workspace. Filter by status.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      status: { type: 'string', description: 'pending|sent|responded|expired' },
      limit: { type: 'number', description: 'Max results (default 20)' },
    },
    required: ['workspaceId'],
  },

  async execute(input: QueryFollowUpsInput, _ctx: WorkspaceContext): Promise<ToolResult<QueryFollowUpsOutput>> {
    const admin = createAdminClient()
    let query = admin
      .from('follow_ups')
      .select('id, customer_phone, customer_email, follow_up_number, scheduled_for, status, sent_at')
      .eq('workspace_id', input.workspaceId)
      .order('scheduled_for', { ascending: true })
      .limit(input.limit ?? 20)

    if (input.status) query = query.eq('status', input.status)

    const { data, error } = await query

    if (error) return { status: 'error', output: { followUps: [] }, error: error.message }

    return {
      status: 'success',
      output: {
        followUps: (data ?? []).map((f) => ({
          id: f.id,
          customer_phone: f.customer_phone,
          customer_email: f.customer_email,
          follow_up_number: f.follow_up_number,
          scheduled_for: f.scheduled_for,
          status: f.status,
          sent_at: f.sent_at,
        })),
      },
    }
  },
}
