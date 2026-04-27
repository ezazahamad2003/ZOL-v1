import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  getGoogleOAuthRedirectUri,
  getUserEmail,
} from '@/lib/google/oauth'
import { encrypt } from '@/lib/crypto/encrypt'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')  // workspaceId
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error)}&step=3`, req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_params&step=3', req.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const email = await getUserEmail(tokens.accessToken)
    const encryptedRefreshToken = encrypt(tokens.refreshToken)
    const encryptedAccessToken = encrypt(tokens.accessToken)

    const admin = createAdminClient()

    // Fetch the primary calendar ID
    let calendarId = 'primary'
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        getGoogleOAuthRedirectUri()
      )
      oauth2Client.setCredentials({ access_token: tokens.accessToken })
      const cal = google.calendar({ version: 'v3', auth: oauth2Client })
      const { data } = await cal.calendarList.get({ calendarId: 'primary' })
      calendarId = data.id ?? 'primary'
    } catch { /* use primary fallback */ }

    const expiresAt = tokens.expiry
      ? new Date(tokens.expiry).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    // Upsert google_calendar integration
    await admin
      .from('integrations')
      .upsert(
        {
          workspace_id: state,
          provider: 'google_calendar',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
          metadata: { calendar_id: calendarId, email },
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,provider' }
      )

    // Upsert gmail integration (same tokens)
    await admin
      .from('integrations')
      .upsert(
        {
          workspace_id: state,
          provider: 'gmail',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
          metadata: { email },
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,provider' }
      )

    // Mark workspace as active
    await admin
      .from('workspaces')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', state)

    return NextResponse.redirect(new URL(`/`, req.url))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed'
    console.error('[google/oauth/callback]', message)
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(message)}&step=3`, req.url)
    )
  }
}
