import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Mail, Clock, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { FollowUp } from '@/lib/supabase/types'

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    pending: 'warning',
    sent: 'default',
    responded: 'success',
    expired: 'secondary',
  }
  return <Badge variant={variants[status] ?? 'secondary'}>{status}</Badge>
}

function FollowUpRow({ fu }: { fu: FollowUp }) {
  return (
    <Card className="hover:border-orange-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-full bg-orange-50 p-2 shrink-0">
              <Mail className="h-4 w-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {fu.customer_email && (
                  <p className="text-sm font-medium text-gray-900">{fu.customer_email}</p>
                )}
                {fu.customer_phone && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono">{fu.customer_phone}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Follow-up #{fu.follow_up_number}
              </p>
            </div>
          </div>
          <StatusBadge status={fu.status} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Scheduled {formatDate(fu.scheduled_for)}</span>
          </div>
          {fu.sent_at && (
            <span>Sent {formatDate(fu.sent_at)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function FollowUpsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!workspace) redirect('/onboarding')

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('scheduled_for', { ascending: false })
    .limit(50)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-orange-600" />
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <span className="text-sm text-gray-500">({followUps?.length ?? 0})</span>
      </div>

      {!followUps?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-24">
          <Mail className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-400">No follow-ups yet</p>
          <p className="text-sm text-gray-400">Follow-ups created by the AI agent will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => <FollowUpRow key={fu.id} fu={fu} />)}
        </div>
      )}
    </div>
  )
}
