import { createAdminClient } from '@/lib/supabase/admin'
import { draftEmailTool } from './draft-email'
import type { Tool, TriggerFollowUpInput, TriggerFollowUpOutput, WorkspaceContext, ToolResult } from '../types'

export const triggerFollowUpTool: Tool<TriggerFollowUpInput, TriggerFollowUpOutput> = {
  name: 'trigger_follow_up',
  description: 'Create a follow-up record for a call, optionally drafting a follow-up email.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      callId: { type: 'string', description: 'Call ID to follow up on' },
      customerPhone: { type: 'string', description: 'Customer phone number' },
      customerEmail: { type: 'string', description: 'Customer email (used for draft email)' },
      followUpNumber: { type: 'number', description: '1 or 2 (default 1)' },
      scheduledFor: { type: 'string', description: 'ISO datetime to schedule the follow-up (default 3 days from now)' },
    },
    required: ['workspaceId', 'callId'],
  },

  async execute(input: TriggerFollowUpInput, ctx: WorkspaceContext): Promise<ToolResult<TriggerFollowUpOutput>> {
    const admin = createAdminClient()

    const scheduledFor = input.scheduledFor
      ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Create follow-up record
    const { data: followUp, error: fuErr } = await admin
      .from('follow_ups')
      .insert({
        workspace_id: input.workspaceId,
        call_id: input.callId,
        customer_phone: input.customerPhone ?? null,
        customer_email: input.customerEmail ?? null,
        follow_up_number: input.followUpNumber ?? 1,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      .select('id')
      .single()

    if (fuErr || !followUp) {
      return {
        status: 'error',
        output: { followUpId: '', emailId: null },
        error: fuErr?.message ?? 'Failed to create follow-up',
      }
    }

    // Draft a follow-up email if we have an email address
    let emailId: string | null = null
    if (input.customerEmail) {
      const emailResult = await draftEmailTool.execute(
        {
          workspaceId: input.workspaceId,
          toEmail: input.customerEmail,
          subject: `Following up on your recent service inquiry — ${ctx.workspaceName}`,
          bodyHtml: `<p>Hi,</p>
<p>We wanted to follow up on your recent inquiry at ${ctx.workspaceName}.</p>
<p>Please call us or reply to this email if you'd like to schedule a service appointment.</p>
<p>Best regards,<br>${ctx.workspaceName}</p>`,
          callId: input.callId,
        },
        ctx
      )
      if (emailResult.status === 'success') {
        emailId = emailResult.output.emailId
        // Link email to follow-up
        await admin
          .from('follow_ups')
          .update({ email_id: emailId })
          .eq('id', followUp.id)
      }
    }

    return {
      status: 'success',
      output: { followUpId: followUp.id, emailId },
    }
  },
}
