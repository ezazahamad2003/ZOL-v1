import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, DraftEmailInput, DraftEmailOutput, WorkspaceContext, ToolResult } from '../types'

export const draftEmailTool: Tool<DraftEmailInput, DraftEmailOutput> = {
  name: 'draft_email',
  description: 'Save an email as a draft (without sending) for later review.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      toEmail: { type: 'string', description: 'Recipient email address' },
      subject: { type: 'string', description: 'Email subject' },
      bodyHtml: { type: 'string', description: 'Email body as HTML' },
      callId: { type: 'string', description: 'Optional call ID to associate with this email' },
    },
    required: ['workspaceId', 'toEmail', 'subject', 'bodyHtml'],
  },

  async execute(input: DraftEmailInput, _ctx: WorkspaceContext): Promise<ToolResult<DraftEmailOutput>> {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('emails')
      .insert({
        workspace_id: input.workspaceId,
        call_id: input.callId ?? null,
        to_email: input.toEmail,
        subject: input.subject,
        body_html: input.bodyHtml,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !data) {
      return { status: 'error', output: { emailId: '' }, error: error?.message ?? 'Failed to create draft' }
    }

    return { status: 'success', output: { emailId: data.id } }
  },
}
