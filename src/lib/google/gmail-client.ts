/**
 * Per-workspace Gmail client factory.
 * Reads tokens from integrations table (provider: 'gmail').
 */

import { google } from 'googleapis'
import { decrypt } from '@/lib/crypto/encrypt'
import { getGoogleOAuthRedirectUri } from '@/lib/google/oauth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SendEmailParams {
  to: string
  subject: string
  bodyHtml: string
  fromName?: string
}

async function getGmailClient(workspaceId: string) {
  const admin = createAdminClient()

  const { data: integration, error } = await admin
    .from('integrations')
    .select('refresh_token, metadata')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'gmail')
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !integration) {
    throw new Error(`Workspace ${workspaceId} has no Gmail integration. Complete Google OAuth first.`)
  }
  if (!integration.refresh_token) {
    throw new Error(`Workspace ${workspaceId} Gmail integration has no refresh token.`)
  }

  const refreshToken = decrypt(integration.refresh_token)
  const metadata = (integration.metadata ?? {}) as Record<string, string>
  const fromEmail = metadata.email ?? 'noreply@zol.ai'

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleOAuthRedirectUri()
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    fromEmail,
  }
}

function buildRawEmail(params: {
  from: string
  to: string
  subject: string
  bodyHtml: string
}): string {
  const { from, to, subject, bodyHtml } = params
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    bodyHtml,
  ]
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

export async function sendEmail(
  workspaceId: string,
  params: SendEmailParams
): Promise<string> {
  const { gmail, fromEmail } = await getGmailClient(workspaceId)

  const raw = buildRawEmail({
    from: params.fromName ? `${params.fromName} <${fromEmail}>` : fromEmail,
    to: params.to,
    subject: params.subject,
    bodyHtml: params.bodyHtml,
  })

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })

  return res.data.id ?? ''
}
