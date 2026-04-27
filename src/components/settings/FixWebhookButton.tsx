'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FixWebhookButton({ hasPhone }: { hasPhone: boolean }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!hasPhone) return null

  async function handleFix() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/fix-vapi-webhook', { method: 'POST' })
      const data = await res.json() as { success?: boolean; webhookUrl?: string; error?: string }
      if (res.ok && data.success) {
        setResult({ success: true, message: `Webhook updated → ${data.webhookUrl}` })
      } else {
        setResult({ success: false, message: data.error ?? 'Failed to update webhook' })
      }
    } catch {
      setResult({ success: false, message: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={handleFix}
        disabled={loading}
        className="flex items-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync Webhook URL to This Domain
      </Button>

      {result && (
        <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${
          result.success
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {result.success
            ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span className="font-mono text-xs break-all">{result.message}</span>
        </div>
      )}
    </div>
  )
}
