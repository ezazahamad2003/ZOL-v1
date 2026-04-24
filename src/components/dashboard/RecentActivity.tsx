import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Call, Appointment, FollowUp } from '@/lib/supabase/types'

interface RecentActivityProps {
  calls: Call[]
  appointments: Appointment[]
  followUps: FollowUp[]
}

const sentimentVariants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'warning',
  frustrated: 'destructive',
}

const appointmentVariants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  scheduled: 'default',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'warning',
}

const followUpVariants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'warning',
  sent: 'default',
  responded: 'success',
  expired: 'secondary',
}

export function RecentActivity({ calls, appointments, followUps }: RecentActivityProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {calls.length === 0 && <p className="text-sm text-gray-500">No calls yet</p>}
          {calls.map((call) => (
            <Link key={call.id} href={`/dashboard/calls/${call.id}`} className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {call.caller_name ?? call.caller_phone ?? call.id.slice(0, 8)}
                </span>
                {call.sentiment && (
                  <Badge variant={sentimentVariants[call.sentiment] ?? 'secondary'} className="text-xs shrink-0">
                    {call.sentiment}
                  </Badge>
                )}
              </div>
              {call.summary && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-1">{call.summary}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{formatDate(call.created_at)}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 && <p className="text-sm text-gray-500">No appointments yet</p>}
          {appointments.map((appt) => (
            <Link key={appt.id} href="/dashboard/appointments" className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {appt.customer_name ?? 'Unknown'}
                </span>
                <Badge variant={appointmentVariants[appt.status] ?? 'secondary'} className="text-xs">{appt.status}</Badge>
              </div>
              {appt.service_type && (
                <p className="mt-1 text-xs text-gray-500">{appt.service_type}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{formatDate(appt.scheduled_at)}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-Ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {followUps.length === 0 && <p className="text-sm text-gray-500">No follow-ups yet</p>}
          {followUps.map((fu) => (
            <Link key={fu.id} href="/dashboard/follow-ups" className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {fu.customer_email ?? fu.customer_phone ?? 'Unknown'}
                </span>
                <Badge variant={followUpVariants[fu.status] ?? 'secondary'} className="text-xs">{fu.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                #{fu.follow_up_number} · {formatDate(fu.scheduled_for)}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
