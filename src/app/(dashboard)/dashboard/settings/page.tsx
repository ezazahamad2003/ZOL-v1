import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Phone, Mail, Calendar, Clock, Wifi, WifiOff } from 'lucide-react'
import type { BusinessHours } from '@/lib/supabase/types'
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!workspace) redirect('/onboarding')

  // Fetch integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, status, metadata')
    .eq('workspace_id', workspace.id)

  const calendarIntegration = integrations?.find((i) => i.provider === 'google_calendar')
  const gmailIntegration = integrations?.find((i) => i.provider === 'gmail')
  const hours = (workspace.business_hours as BusinessHours) ?? {}

  const isCalendarConnected = calendarIntegration?.status === 'connected'
  const isGmailConnected = gmailIntegration?.status === 'connected'
  const isPhoneProvisioned = !!workspace.vapi_phone_number_id

  const gmailMeta = (gmailIntegration?.metadata ?? {}) as Record<string, string>
  const calMeta = (calendarIntegration?.metadata ?? {}) as Record<string, string>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium">{workspace.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Badge variant={workspace.status === 'active' ? 'success' : 'warning'} className="mt-1">
                {workspace.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500">Timezone</p>
              <p className="text-sm font-medium">{workspace.timezone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">AI Tone</p>
              <p className="text-sm font-medium capitalize">{workspace.ai_tone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Phone Number */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" /> AI Phone Number
              </CardTitle>
              {isPhoneProvisioned ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Not provisioned</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {workspace.vapi_phone_number ? (
              <p className="text-xl font-mono text-blue-600">{workspace.vapi_phone_number}</p>
            ) : (
              <p className="text-sm text-gray-400">Complete onboarding to provision a number</p>
            )}
            {workspace.vapi_phone_number_id && (
              <p className="mt-2 text-xs text-gray-400">Vapi ID: {workspace.vapi_phone_number_id}</p>
            )}
            {workspace.human_redirect_number && (
              <p className="mt-1 text-xs text-gray-400">Redirect: {workspace.human_redirect_number}</p>
            )}
          </CardContent>
        </Card>

        {/* Gmail */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Gmail
              </CardTitle>
              {isGmailConnected ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <Wifi className="h-3 w-3" /> Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <WifiOff className="h-3 w-3" /> Not connected
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {gmailMeta.email ? (
              <p className="text-sm text-gray-700">{gmailMeta.email}</p>
            ) : (
              <p className="text-sm text-gray-400">Connect Google to send emails</p>
            )}
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Google Calendar
              </CardTitle>
              {isCalendarConnected ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <Wifi className="h-3 w-3" /> Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <WifiOff className="h-3 w-3" /> Not connected
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {calMeta.calendar_id ? (
              <p className="text-sm text-gray-700">Calendar ID: {calMeta.calendar_id}</p>
            ) : (
              <p className="text-sm text-gray-400">Connect Google to sync appointments</p>
            )}
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Business Hours
            </CardTitle>
            <CardDescription>Outside these hours, all calls go to the AI receptionist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                const dayHours = hours[day]
                return (
                  <div key={day} className="space-y-1">
                    <p className="font-medium text-gray-700 capitalize">{day}</p>
                    {dayHours ? (
                      <>
                        <p className="text-xs text-gray-500">{dayHours.open}</p>
                        <p className="text-xs text-gray-500">{dayHours.close}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Closed</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="lg:col-span-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account, workspace, and all associated data including your Vapi phone number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
