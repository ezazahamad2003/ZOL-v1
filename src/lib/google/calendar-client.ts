/**
 * Per-shop Google Calendar client factory.
 * Same token pattern as gmail-client.ts.
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

async function getCalendarClient(shopId: string) {
  const admin = createAdminClient()
  const { data: shop, error } = await admin
    .from('shops')
    .select('google_refresh_token_encrypted, google_calendar_id')
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
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: shop.google_calendar_id ?? 'primary',
  }
}

export async function createCalendarEvent(
  shopId: string,
  params: CreateEventParams
): Promise<string> {
  const { calendar, calendarId } = await getCalendarClient(shopId)

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
  shopId: string,
  eventId: string
): Promise<void> {
  const { calendar, calendarId } = await getCalendarClient(shopId)
  await calendar.events.delete({ calendarId, eventId })
}
