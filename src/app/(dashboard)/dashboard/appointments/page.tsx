import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Clock, User, Wrench } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Appointment } from '@/lib/supabase/types'

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    scheduled: 'default',
    completed: 'success',
    cancelled: 'destructive',
    no_show: 'warning',
  }
  return <Badge variant={variants[status] ?? 'secondary'}>{status}</Badge>
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  return (
    <Card className="hover:border-green-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-full bg-green-50 p-2 shrink-0">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {appt.customer_name ?? 'Unknown'}
                </p>
                {appt.customer_phone && (
                  <span className="text-xs text-gray-400 font-mono">{appt.customer_phone}</span>
                )}
              </div>
              {appt.service_type && (
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                  <Wrench className="h-3 w-3" />
                  <span>{appt.service_type}</span>
                </div>
              )}
            </div>
          </div>
          <StatusBadge status={appt.status} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(appt.scheduled_at)}</span>
          </div>
          <span>{appt.duration_minutes} min</span>
          {appt.customer_email && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{appt.customer_email}</span>
            </div>
          )}
          {appt.google_event_id && (
            <span className="text-green-500">Cal synced</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!workspace) redirect('/onboarding')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('scheduled_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <span className="text-sm text-gray-500">({appointments?.length ?? 0})</span>
      </div>

      {!appointments?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-24">
          <Calendar className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-400">No appointments yet</p>
          <p className="text-sm text-gray-400">Appointments booked via the AI or agent will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => <AppointmentRow key={appt.id} appt={appt} />)}
        </div>
      )}
    </div>
  )
}
