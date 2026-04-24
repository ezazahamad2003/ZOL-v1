/**
 * Per-workspace Google Calendar client factory.
 * Reads tokens from integrations table (provider: 'google_calendar').
 */

import { google } from 'googleapis'
import { decrypt } from '@/lib/crypto/encrypt'
import { getGoogleOAuthRedirectUri } from '@/lib/google/oauth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CreateEventParams {
  summary: string
  description?: string
  startTime: string  // ISO 8601
  endTime: string    // ISO 8601
  attendeeEmail?: string
}

async function getCalendarClient(workspaceId: string) {
  const admin = createAdminClient()

  const { data: integration, error } = await admin
    .from('integrations')
    .select('refresh_token, metadata')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !integration) {
    throw new Error(`Workspace ${workspaceId} has no Google Calendar integration. Complete Google OAuth first.`)
  }
  if (!integration.refresh_token) {
    throw new Error(`Workspace ${workspaceId} Google Calendar integration has no refresh token.`)
  }

  const refreshToken = decrypt(integration.refresh_token)
  const metadata = (integration.metadata ?? {}) as Record<string, string>
  const calendarId = metadata.calendar_id ?? 'primary'

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleOAuthRedirectUri()
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId,
  }
}

export async function createCalendarEvent(
  workspaceId: string,
  params: CreateEventParams
): Promise<string> {
  const { calendar, calendarId } = await getCalendarClient(workspaceId)

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startTime, timeZone: 'America/Los_Angeles' },
      end: { dateTime: params.endTime, timeZone: 'America/Los_Angeles' },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  })

  return event.data.id ?? ''
}

export async function deleteCalendarEvent(
  workspaceId: string,
  eventId: string
): Promise<void> {
  const { calendar, calendarId } = await getCalendarClient(workspaceId)
  await calendar.events.delete({ calendarId, eventId })
}
