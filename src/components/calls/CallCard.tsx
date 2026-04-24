import Link from 'next/link'
import { Phone, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Call } from '@/lib/supabase/types'

interface CallCardProps {
  call: Call
}

const sentimentVariants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'warning',
  frustrated: 'destructive',
}

const statusVariants: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  completed: 'success',
  missed: 'destructive',
  voicemail: 'warning',
}

export function CallCard({ call }: CallCardProps) {
  return (
    <Link href={`/dashboard/calls/${call.id}`}>
      <Card className="hover:border-blue-300 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {call.caller_name ?? call.caller_phone ?? call.vapi_call_id?.slice(0, 12) ?? call.id.slice(0, 12)}
                </p>
                {call.caller_phone && (
                  <p className="text-xs text-gray-500">{call.caller_phone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {call.sentiment && (
                <Badge variant={sentimentVariants[call.sentiment] ?? 'secondary'} className="text-xs">
                  {call.sentiment}
                </Badge>
              )}
              <Badge variant={statusVariants[call.status] ?? 'secondary'}>{call.status}</Badge>
            </div>
          </div>
          {call.summary && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">{call.summary}</p>
          )}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{formatDate(call.created_at)}</span>
            {call.duration_seconds && (
              <span className="ml-2">· {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
