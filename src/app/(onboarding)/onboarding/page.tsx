'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Building2, Phone, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ['Workspace Info', 'Phone Setup', 'Connect Google']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
              i + 1 === current
                ? 'bg-blue-600 text-white'
                : i + 1 < current
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1 < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`ml-2 text-sm ${
              i + 1 === current ? 'font-medium text-gray-900' : 'text-gray-500'
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 && <div className="mx-4 h-px w-12 bg-gray-300" />}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Create Workspace ─────────────────────────────────────────────────

function Step1({
  onSuccess,
}: {
  onSuccess: (workspaceId: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get('name') as string,
      humanRedirectNumber: form.get('humanRedirectNumber') as string || undefined,
      timezone: form.get('timezone') as string || 'America/Los_Angeles',
      aiTone: form.get('aiTone') as string || 'professional',
    }

    try {
      const res = await fetch('/api/workspaces/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { workspaceId?: string; error?: string }
      if (!res.ok || !data.workspaceId) {
        setError(data.error ?? 'Failed to create workspace')
      } else {
        onSuccess(data.workspaceId)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>Workspace Information</CardTitle>
            <CardDescription>Tell us about your mechanic shop</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Shop Name *</Label>
            <Input id="name" name="name" placeholder="e.g. Dave's Auto Repair" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="humanRedirectNumber">Human Redirect Number</Label>
            <Input
              id="humanRedirectNumber"
              name="humanRedirectNumber"
              type="tel"
              placeholder="+14155551234"
            />
            <p className="text-xs text-gray-500">E.164 format. Used when callers request to speak to a human.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiTone">AI Receptionist Tone</Label>
            <select
              id="aiTone"
              name="aiTone"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue to Phone Setup →'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Step 2: Provision VAPI Phone ─────────────────────────────────────────────

function Step2({
  workspaceId,
  onSuccess,
}: {
  workspaceId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleProvision() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await res.json() as { phoneNumber?: string; error?: string }
      if (!res.ok || !data.phoneNumber) {
        setError(data.error ?? 'Failed to provision phone number')
      } else {
        setPhoneNumber(data.phoneNumber)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>AI Phone Line</CardTitle>
            <CardDescription>
              We&apos;ll provision a US phone number and configure your AI receptionist.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {phoneNumber ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Phone number provisioned!</span>
            </div>
            <p className="text-2xl font-mono text-green-800 font-bold">{phoneNumber}</p>
            <p className="text-sm text-green-600">Calls to this number will be answered by your AI receptionist 24/7.</p>
          </div>
        ) : (
          <Button onClick={handleProvision} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Provisioning…
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Get My AI Phone Number
              </>
            )}
          </Button>
        )}

        <div className="flex gap-3">
          {phoneNumber && (
            <Button onClick={onSuccess} className="flex-1">
              Continue to Google →
            </Button>
          )}
          <Button variant="ghost" onClick={onSuccess} className="flex-1 text-gray-500">
            Skip for now →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Step 3: Connect Google ───────────────────────────────────────────────────

function Step3({
  workspaceId,
  error,
}: {
  workspaceId: string
  error?: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isGoogleConfigured = !!(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === 'true'
  )

  async function handleConnect() {
    setLoading(true)
    const res = await fetch(`/api/google/oauth/start?workspaceId=${workspaceId}`)
    const data = await res.json() as { url?: string }
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>Connect Google</CardTitle>
            <CardDescription>Link Gmail + Google Calendar to send emails and book appointments.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <ul className="space-y-2">
          {[
            'Send follow-up emails via your shop Gmail',
            'Book appointments in Google Calendar',
            'Each workspace uses its own Google account',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <Mail className="h-4 w-4" />
                Connect Google Account
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={() => router.push('/dashboard')}
          >
            Skip for now → Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main onboarding page ─────────────────────────────────────────────────────

export default function OnboardingPage({
  searchParams,
}: {
  searchParams?: { step?: string; error?: string; workspaceId?: string }
}) {
  const [step, setStep] = useState(
    searchParams?.step ? parseInt(searchParams.step) : 1
  )
  const [workspaceId, setWorkspaceId] = useState(searchParams?.workspaceId ?? '')

  function handleStep1Success(id: string) {
    setWorkspaceId(id)
    setStep(2)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center">
          <Image src="/zol-logo.png" alt="ZOL" width={48} height={48} className="rounded-xl" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Set Up ZOL</h1>
          <p className="mt-1 text-sm text-gray-500">Get your AI receptionist running in minutes</p>
        </div>

        <Steps current={step} />

        {step === 1 && <Step1 onSuccess={handleStep1Success} />}
        {step === 2 && (
          <Step2
            workspaceId={workspaceId}
            onSuccess={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            workspaceId={workspaceId}
            error={searchParams?.error}
          />
        )}
      </div>
    </div>
  )
}
