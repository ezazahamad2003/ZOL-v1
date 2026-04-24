import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Phone, Calendar, Mail, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { AgentCommandBox } from '@/components/dashboard/AgentCommandBox'

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    positive: 'success',
    neutral: 'secondary',
    negative: 'destructive',
    frustrated: 'warning',
  }
  if (!sentiment) return null
  return <Badge variant={variants[sentiment] ?? 'secondary'}>{sentiment}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    completed: 'success',
    missed: 'destructive',
    voicemail: 'secondary',
    scheduled: 'default',
    cancelled: 'destructive',
    no_show: 'warning',
    pending: 'warning',
    sent: 'success',
  }
  return <Badge variant={variants[status] ?? 'secondary'}>{status}</Badge>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!workspace) redirect('/onboarding')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    callsTodayRes,
    apptTodayRes,
    pendingFollowUpsRes,
    recentCallsRes,
    upcomingApptRes,
  ] = await Promise.all([
    supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .gte('created_at', todayStart),

    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', tomorrowStart)
      .eq('status', 'scheduled'),

    supabase
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('status', 'pending'),

    supabase
      .from('calls')
      .select('id, caller_name, caller_phone, summary, sentiment, status, created_at, duration_seconds')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('appointments')
      .select('id, customer_name, customer_phone, service_type, scheduled_at, status, duration_minutes')
      .eq('workspace_id', workspace.id)
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', weekLater)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ])

  const stats = [
    {
      label: 'Calls Today',
      value: callsTodayRes.count ?? 0,
      icon: Phone,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Appointments Today',
      value: apptTodayRes.count ?? 0,
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pending Follow-ups',
      value: pendingFollowUpsRes.count ?? 0,
      icon: Mail,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Revenue Opps',
      value: recentCallsRes.data?.filter((c) => c.sentiment !== 'negative').length ?? 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back — here&apos;s what&apos;s happening at {workspace.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Command Box */}
      <AgentCommandBox workspaceId={workspace.id} />

      {/* Recent Calls + Upcoming Appointments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Calls</CardTitle>
            <Link href="/dashboard/calls" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentCallsRes.data ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No calls yet</p>
            )}
            {(recentCallsRes.data ?? []).map((call) => (
              <Link
                key={call.id}
                href={`/dashboard/calls/${call.id}`}
                className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {call.caller_name ?? call.caller_phone ?? 'Unknown caller'}
                    </p>
                    {call.summary && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{call.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <SentimentBadge sentiment={call.sentiment} />
                    <StatusBadge status={call.status} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(call.created_at)}</span>
                  {call.duration_seconds && (
                    <span className="ml-2">{Math.round(call.duration_seconds / 60)}m</span>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Appointments</CardTitle>
            <Link href="/dashboard/appointments" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(upcomingApptRes.data ?? []).length === 0 && (
              <p className="text-sm text-gray-500">No upcoming appointments</p>
            )}
            {(upcomingApptRes.data ?? []).map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.customer_name ?? 'Unknown'}
                    </p>
                    {appt.service_type && (
                      <p className="text-xs text-gray-500 mt-0.5">{appt.service_type}</p>
                    )}
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(appt.scheduled_at)}</span>
                  <span className="ml-1">({appt.duration_minutes}min)</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
