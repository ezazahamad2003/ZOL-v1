import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Phone, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Call } from '@/lib/supabase/types'

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    positive: 'success',
    neutral: 'secondary',
    negative: 'destructive',
    frustrated: 'warning',
  }
  return <Badge variant={variants[sentiment] ?? 'secondary'}>{sentiment}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    completed: 'success',
    missed: 'destructive',
    voicemail: 'secondary',
  }
  return <Badge variant={variants[status] ?? 'secondary'}>{status}</Badge>
}

function CallRow({ call }: { call: Call }) {
  return (
    <Card className="hover:border-blue-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-full bg-blue-50 p-2 shrink-0">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {call.caller_name ?? 'Unknown caller'}
                </p>
                {call.caller_phone && (
                  <span className="text-xs text-gray-400 font-mono">{call.caller_phone}</span>
                )}
              </div>
              {call.summary && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{call.summary}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={call.status} />
            <SentimentBadge sentiment={call.sentiment} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(call.created_at)}</span>
          </div>
          {call.duration_seconds && (
            <span>{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
          )}
          {call.caller_email && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{call.caller_email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!workspace) redirect('/onboarding')

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Phone className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
        <span className="text-sm text-gray-500">({calls?.length ?? 0})</span>
      </div>

      {!calls?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-24">
          <Phone className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-400">No calls yet</p>
          <p className="text-sm text-gray-400">Calls will appear here after your phone line is provisioned</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => <CallRow key={call.id} call={call} />)}
        </div>
      )}
    </div>
  )
}
