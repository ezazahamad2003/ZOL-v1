import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, GetInsightsInput, GetInsightsOutput, WorkspaceContext, ToolResult } from '../types'

export const getInsightsTool: Tool<GetInsightsInput, GetInsightsOutput> = {
  name: 'get_insights',
  description: 'Get call insights (pain points, service requests, feedback) with urgency summary.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      insightType: { type: 'string', description: 'pain_point|service_request|feedback' },
      urgency: { type: 'string', description: 'low|medium|high|emergency' },
      limit: { type: 'number', description: 'Max results (default 50)' },
    },
    required: ['workspaceId'],
  },

  async execute(input: GetInsightsInput, _ctx: WorkspaceContext): Promise<ToolResult<GetInsightsOutput>> {
    const admin = createAdminClient()

    // Fetch insights via call join
    let query = admin
      .from('call_insights')
      .select('id, call_id, insight_type, content, urgency, created_at, calls!inner(workspace_id)')
      .eq('calls.workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 50)

    if (input.insightType) query = query.eq('insight_type', input.insightType)
    if (input.urgency) query = query.eq('urgency', input.urgency)

    const { data, error } = await query

    if (error) {
      return {
        status: 'error',
        output: { insights: [], summary: { total: 0, byType: {}, byUrgency: {} } },
        error: error.message,
      }
    }

    const insights = (data ?? []).map((i) => ({
      id: i.id,
      call_id: i.call_id,
      insight_type: i.insight_type,
      content: i.content,
      urgency: i.urgency,
      created_at: i.created_at,
    }))

    // Build summary
    const byType: Record<string, number> = {}
    const byUrgency: Record<string, number> = {}
    for (const insight of insights) {
      byType[insight.insight_type] = (byType[insight.insight_type] ?? 0) + 1
      byUrgency[insight.urgency] = (byUrgency[insight.urgency] ?? 0) + 1
    }

    return {
      status: 'success',
      output: {
        insights,
        summary: { total: insights.length, byType, byUrgency },
      },
    }
  },
}
