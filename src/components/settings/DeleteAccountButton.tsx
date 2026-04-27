'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteAccountButton() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const CONFIRM_PHRASE = 'delete my account'
  const isConfirmed = confirmText.toLowerCase() === CONFIRM_PHRASE

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to delete account. Please try again.')
        setLoading(false)
        return
      }

      // Sign out locally and redirect to landing page
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete Account
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-800">This action is permanent and cannot be undone.</p>
          <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
            <li>Your account and all data will be deleted</li>
            <li>Your AI phone number will be released from Vapi</li>
            <li>All calls, appointments, and follow-ups will be removed</li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-red-800 font-medium">
          Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to confirm:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={loading}
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-100 border border-red-200 rounded p-2">{error}</p>
      )}

      <div className="flex gap-3">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={!isConfirmed || loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
          ) : (
            <><Trash2 className="h-4 w-4" /> Permanently Delete Account</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
