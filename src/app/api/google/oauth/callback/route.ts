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
  const state = searchParams.get('state')  // shopId
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect-google?error=${encodeURIComponent(error)}&shopId=${state}`, req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connect-google?error=missing_params', req.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const email = await getUserEmail(tokens.accessToken)
    const encryptedRefreshToken = encrypt(tokens.refreshToken)

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

    await admin
      .from('shops')
      .update({
        google_email: email,
        google_refresh_token_encrypted: encryptedRefreshToken,
        google_calendar_id: calendarId,
        onboarding_status: 'google_connected',
      })
      .eq('id', state)

    return NextResponse.redirect(
      new URL(`/provision-phone?shopId=${state}`, req.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed'
    console.error('[google/oauth/callback]', message)
    return NextResponse.redirect(
      new URL(`/connect-google?error=${encodeURIComponent(message)}&shopId=${state}`, req.url)
    )
  }
}
