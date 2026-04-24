import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrendingUp, AlertTriangle, Wrench, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

function UrgencyBadge({ urgency }: { urgency: string }) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    emergency: 'destructive',
  }
  return <Badge variant={variants[urgency] ?? 'secondary'}>{urgency}</Badge>
}

function InsightTypeIcon({ type }: { type: string }) {
  if (type === 'pain_point') return <AlertTriangle className="h-4 w-4 text-red-500" />
  if (type === 'service_request') return <Wrench className="h-4 w-4 text-blue-500" />
  return <MessageSquare className="h-4 w-4 text-gray-500" />
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!workspace) redirect('/onboarding')

  // Get insights with call info
  const { data: insights } = await supabase
    .from('call_insights')
    .select('*, calls!inner(workspace_id, caller_name, caller_phone, created_at)')
    .eq('calls.workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Summary stats
  const byType: Record<string, number> = {}
  const byUrgency: Record<string, number> = {}
  for (const insight of insights ?? []) {
    byType[insight.insight_type] = (byType[insight.insight_type] ?? 0) + 1
    byUrgency[insight.urgency] = (byUrgency[insight.urgency] ?? 0) + 1
  }

  const painPoints = (insights ?? []).filter((i) => i.insight_type === 'pain_point')
  const serviceRequests = (insights ?? []).filter((i) => i.insight_type === 'service_request')
  const feedback = (insights ?? []).filter((i) => i.insight_type === 'feedback')

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Pain Points', value: byType.pain_point ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Service Requests', value: byType.service_request ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Feedback', value: byType.feedback ?? 0, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Emergency', value: byUrgency.emergency ?? 0, color: 'text-red-700', bg: 'bg-red-100' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!insights?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-24">
          <TrendingUp className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-400">No insights yet</p>
          <p className="text-sm text-gray-400">Insights are extracted from call transcripts by the AI agent</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pain Points */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Pain Points ({painPoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {painPoints.length === 0 && <p className="text-sm text-gray-400">None detected</p>}
              {painPoints.map((i) => (
                <div key={i.id} className="rounded-lg border border-gray-100 p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700">{i.content}</p>
                    <UrgencyBadge urgency={i.urgency} />
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(i.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Service Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                Service Requests ({serviceRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceRequests.length === 0 && <p className="text-sm text-gray-400">None detected</p>}
              {serviceRequests.map((i) => (
                <div key={i.id} className="rounded-lg border border-gray-100 p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700">{i.content}</p>
                    <UrgencyBadge urgency={i.urgency} />
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(i.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                Feedback ({feedback.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.length === 0 && <p className="text-sm text-gray-400">None detected</p>}
              {feedback.map((i) => (
                <div key={i.id} className="rounded-lg border border-gray-100 p-3 space-y-1">
                  <p className="text-sm text-gray-700">{i.content}</p>
                  <p className="text-xs text-gray-400">{formatDate(i.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
