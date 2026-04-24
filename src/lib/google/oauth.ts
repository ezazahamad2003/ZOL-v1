/**
 * Google OAuth 2.0 helpers for per-shop Gmail + Calendar auth.
 * Scopes: gmail.send + calendar.events
 */

import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

const CALLBACK_PATH = '/api/google/oauth/callback'

/**
 * Must match exactly one URI in Google Cloud → OAuth client → Authorized redirect URIs.
 * Prefer NEXT_PUBLIC_APP_URL (same as deployed host). Uses URL.origin only so a mistaken
 * path on NEXT_PUBLIC_APP_URL cannot break redirect_uri matching.
 */
export function getGoogleOAuthRedirectUri(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) {
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      const u = new URL(withScheme)
      return `${u.origin}${CALLBACK_PATH}`
    } catch {
      const base = raw.replace(/\/$/, '')
      return `${base}${CALLBACK_PATH}`
    }
  }
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
  if (explicit) return explicit
  throw new Error(
    'Set NEXT_PUBLIC_APP_URL or GOOGLE_OAUTH_REDIRECT_URI for Google OAuth (callback URL)'
  )
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = getGoogleOAuthRedirectUri()

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    )
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthorizationUrl(workspaceId: string): string {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: workspaceId,
  })
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiry?: number
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google OAuth did not return both access_token and refresh_token')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiry: tokens.expiry_date ?? undefined,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  if (!credentials.access_token) {
    throw new Error('Failed to refresh Google access token')
  }

  return credentials.access_token
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  if (!data.email) throw new Error('Could not retrieve email from Google userinfo')
  return data.email
}
