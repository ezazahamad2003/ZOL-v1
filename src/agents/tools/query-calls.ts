import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, QueryCallsInput, QueryCallsOutput, WorkspaceContext, ToolResult } from '../types'

export const queryCallsTool: Tool<QueryCallsInput, QueryCallsOutput> = {
  name: 'query_calls',
  description: 'Query recent calls for the workspace. Returns call list with summary and sentiment.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      limit: { type: 'number', description: 'Max results (default 20)' },
      status: { type: 'string', description: 'Filter by status: completed|missed|voicemail' },
      since: { type: 'string', description: 'ISO date string, only calls after this date' },
    },
    required: ['workspaceId'],
  },

  async execute(input: QueryCallsInput, _ctx: WorkspaceContext): Promise<ToolResult<QueryCallsOutput>> {
    const admin = createAdminClient()
    let query = admin
      .from('calls')
      .select('id, caller_name, caller_phone, summary, sentiment, status, created_at, duration_seconds')
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 20)

    if (input.status) query = query.eq('status', input.status)
    if (input.since) query = query.gte('created_at', input.since)

    const { data, error } = await query

    if (error) return { status: 'error', output: { calls: [] }, error: error.message }

    return {
      status: 'success',
      output: {
        calls: (data ?? []).map((c) => ({
          id: c.id,
          caller_name: c.caller_name,
          caller_phone: c.caller_phone,
          summary: c.summary,
          sentiment: c.sentiment,
          status: c.status,
          created_at: c.created_at,
          duration_seconds: c.duration_seconds,
        })),
      },
    }
  },
}
