import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePhoneNumberServerUrl } from '@/lib/vapi/client'

/**
 * POST /api/admin/fix-vapi-webhook
 * Updates the calling workspace's Vapi phone number serverUrl to match the
 * current NEXT_PUBLIC_APP_URL environment variable.
 * Call this once after deploying to a new domain or after the URL changes.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, vapi_phone_number_id, vapi_phone_number')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!workspace?.vapi_phone_number_id) {
    return NextResponse.json({ error: 'No Vapi phone number provisioned for this workspace' }, { status: 404 })
  }

  const appUrl = (process.env.VAPI_WEBHOOK_URL?.trim()) ||
    `${process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')}/api/vapi/webhook`

  if (!appUrl.startsWith('https://')) {
    return NextResponse.json(
      { error: `Webhook URL must start with https://. Got: ${appUrl}. Set NEXT_PUBLIC_APP_URL to your production URL in Vercel.` },
      { status: 400 }
    )
  }

  try {
    await updatePhoneNumberServerUrl(workspace.vapi_phone_number_id, appUrl)
    console.log(`[fix-vapi-webhook] Updated ${workspace.vapi_phone_number} → ${appUrl}`)
    return NextResponse.json({ success: true, webhookUrl: appUrl, phoneNumber: workspace.vapi_phone_number })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[fix-vapi-webhook] Vapi API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
