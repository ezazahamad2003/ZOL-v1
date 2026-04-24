import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, GetCallTranscriptInput, GetCallTranscriptOutput, WorkspaceContext, ToolResult } from '../types'

export const getCallTranscriptTool: Tool<GetCallTranscriptInput, GetCallTranscriptOutput> = {
  name: 'get_call_transcript',
  description: 'Get the full transcript, summary and action items for a specific call.',
  inputSchema: {
    type: 'object',
    properties: {
      callId: { type: 'string', description: 'Call ID' },
    },
    required: ['callId'],
  },

  async execute(input: GetCallTranscriptInput, _ctx: WorkspaceContext): Promise<ToolResult<GetCallTranscriptOutput>> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('calls')
      .select('id, transcript, summary, action_items')
      .eq('id', input.callId)
      .single()

    if (error || !data) {
      return {
        status: 'error',
        output: { callId: input.callId, transcript: null, summary: null, action_items: null },
        error: error?.message ?? 'Call not found',
      }
    }

    return {
      status: 'success',
      output: {
        callId: data.id,
        transcript: data.transcript,
        summary: data.summary,
        action_items: data.action_items,
      },
    }
  },
}
