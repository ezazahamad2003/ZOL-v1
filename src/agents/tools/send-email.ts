import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail as gmailSend } from '@/lib/google/gmail-client'
import type { Tool, SendEmailInput, SendEmailOutput, WorkspaceContext, ToolResult } from '../types'

export const sendEmailTool: Tool<SendEmailInput, SendEmailOutput> = {
  name: 'send_email',
  description: 'Send an email via Gmail and record it in the database.',
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

  async execute(input: SendEmailInput, _ctx: WorkspaceContext): Promise<ToolResult<SendEmailOutput>> {
    const admin = createAdminClient()
    const sentAt = new Date().toISOString()

    // Insert email record first
    const { data: emailRecord, error: insertErr } = await admin
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

    if (insertErr || !emailRecord) {
      return {
        status: 'error',
        output: { emailId: '', gmailMessageId: null, sentAt },
        error: insertErr?.message ?? 'Failed to create email record',
      }
    }

    // Try to send via Gmail
    let gmailMessageId: string | null = null
    try {
      gmailMessageId = await gmailSend(input.workspaceId, {
        to: input.toEmail,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
      })

      // Mark as sent
      await admin
        .from('emails')
        .update({ status: 'sent', gmail_message_id: gmailMessageId, sent_at: sentAt })
        .eq('id', emailRecord.id)
    } catch (err) {
      // Mark as failed
      await admin
        .from('emails')
        .update({ status: 'failed' })
        .eq('id', emailRecord.id)

      return {
        status: 'error',
        output: { emailId: emailRecord.id, gmailMessageId: null, sentAt },
        error: err instanceof Error ? err.message : 'Failed to send email',
      }
    }

    return {
      status: 'success',
      output: { emailId: emailRecord.id, gmailMessageId, sentAt },
    }
  },
}
