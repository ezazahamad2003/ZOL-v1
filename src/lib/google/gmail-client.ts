/**
 * Per-shop Gmail client factory.
 * Fetches the shop's encrypted refresh token, decrypts it,
 * and returns an authenticated Gmail API client.
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

async function getGmailClient(shopId: string) {
  const admin = createAdminClient()
  const { data: shop, error } = await admin
    .from('shops')
    .select('google_refresh_token_encrypted, google_email')
    .eq('id', shopId)
    .single()

  if (error || !shop) throw new Error(`Shop ${shopId} not found`)
  if (!shop.google_refresh_token_encrypted) {
    throw new Error(`Shop ${shopId} has no Google credentials. Complete Google OAuth first.`)
  }

  const refreshToken = decrypt(shop.google_refresh_token_encrypted)

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleOAuthRedirectUri()
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    fromEmail: shop.google_email ?? 'noreply@zol.ai',
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
  shopId: string,
  params: SendEmailParams
): Promise<string> {
  const { gmail, fromEmail } = await getGmailClient(shopId)

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
