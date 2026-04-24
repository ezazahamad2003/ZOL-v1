'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AgentStep } from '@/lib/supabase/types'

interface AgentCommandBoxProps {
  workspaceId: string
}

interface RunStatus {
  runId: string
  status: 'running' | 'completed' | 'failed'
  steps: AgentStep[]
}

function StepRow({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = step.tool_input || step.tool_output

  return (
    <div className="rounded border border-gray-100 bg-gray-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {step.status === 'success' ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          <span className="font-medium text-gray-700 capitalize">{step.step_type}</span>
          {step.tool_name && (
            <span className="text-gray-500 font-mono">{step.tool_name}</span>
          )}
          {step.duration_ms && (
            <span className="text-gray-400">{step.duration_ms}ms</span>
          )}
        </div>
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {step.error_message && (
        <p className="mt-1 text-red-600">{step.error_message}</p>
      )}

      {expanded && hasDetails && (
        <div className="mt-2 space-y-1">
          {step.tool_input && (
            <div>
              <span className="text-gray-400">Input: </span>
              <code className="text-gray-600 break-all">{JSON.stringify(step.tool_input, null, 2)}</code>
            </div>
          )}
          {step.tool_output && (
            <div>
              <span className="text-gray-400">Output: </span>
              <code className="text-gray-600 break-all">{JSON.stringify(step.tool_output, null, 2)}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentCommandBox({ workspaceId }: AgentCommandBoxProps) {
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [run, setRun] = useState<RunStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for agent steps
  useEffect(() => {
    if (!run || run.status !== 'running') return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agent/status?runId=${run.runId}`)
        const data = await res.json() as {
          status?: string
          steps?: AgentStep[]
        }
        if (data.status) {
          setRun((prev) =>
            prev
              ? {
                  ...prev,
                  status: (data.status as RunStatus['status']) ?? prev.status,
                  steps: data.steps ?? prev.steps,
                }
              : null
          )

          if (data.status === 'completed' || data.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }
      } catch { /* ignore poll errors */ }
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [run?.runId, run?.status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    setRun(null)

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, userPrompt: prompt }),
      })
      const data = await res.json() as { runId?: string; error?: string }

      if (!res.ok || !data.runId) {
        setError(data.error ?? 'Failed to start agent run')
      } else {
        setRun({ runId: data.runId, status: 'running', steps: [] })
        setPrompt('')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tell ZOL what to do</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Show me all missed calls from today, or Book an appointment for John at 2pm tomorrow"
            disabled={submitting || run?.status === 'running'}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={submitting || run?.status === 'running' || !prompt.trim()}
          >
            {submitting || run?.status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {run && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {run.status === 'running' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-blue-600">ZOL is working…</span>
                </>
              )}
              {run.status === 'completed' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Done — {run.steps.length} steps executed</span>
                </>
              )}
              {run.status === 'failed' && (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Agent run failed</span>
                </>
              )}
            </div>

            {run.steps.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {run.steps.map((step) => (
                  <StepRow key={step.id} step={step} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
