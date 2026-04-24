import { NextRequest, NextResponse } from 'next/server'
import { verifyVapiSignature } from '@/lib/vapi/webhook-verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueAgentJob } from '@/lib/cloud-tasks/enqueue'
import type { VapiWebhookPayload } from '@/lib/vapi/types'
import type { Json } from '@/lib/supabase/types'

async function identifyWorkspaceByPhoneNumberId(
  vapiPhoneNumberId: string
): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('workspaces')
    .select('id, name')
    .eq('vapi_phone_number_id', vapiPhoneNumberId)
    .maybeSingle()

  if (error) {
    console.error('[vapi/webhook] DB error looking up workspace:', error)
    return null
  }
  return data
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-vapi-signature')

  if (!verifyVapiSignature(rawBody, signature)) {
    console.error('[vapi/webhook] Invalid signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: VapiWebhookPayload
  try {
    payload = JSON.parse(rawBody) as VapiWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log(JSON.stringify({
    level: 'info',
    message: 'Vapi webhook received',
    type: payload.type,
    callId: payload.call?.id,
    phoneNumberId: payload.phoneNumberId,
  }))

  const workspace = await identifyWorkspaceByPhoneNumberId(payload.phoneNumberId)
  if (!workspace) {
    console.warn('[vapi/webhook] Unknown phoneNumberId:', payload.phoneNumberId)
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  switch (payload.type) {
    case 'call-started': {
      await admin.from('calls').upsert({
        workspace_id: workspace.id,
        vapi_call_id: payload.call.id,
        caller_phone: (payload.call as unknown as Record<string, string>)['customer']?.toString() ?? null,
        status: 'completed',
        created_at: payload.call.startedAt ?? new Date().toISOString(),
      }, { onConflict: 'vapi_call_id' })
      break
    }

    case 'transcript': {
      // Store transcript messages as JSON array
      const messages = payload.messages ?? payload.artifact?.messages ?? []
      if (messages.length > 0) {
        const transcriptJson = messages.map((m) => ({
          role: m.role,
          content: m.message,
          timestamp: m.time,
        }))
        await admin
          .from('calls')
          .update({ transcript: transcriptJson as unknown as Json })
          .eq('vapi_call_id', payload.call.id)
      }
      break
    }

    case 'call-ended':
    case 'end-of-call-report': {
      // Build transcript JSON
      let transcriptJson: Json = null
      const messages = payload.messages ?? payload.artifact?.messages
      if (messages && messages.length > 0) {
        transcriptJson = messages.map((m) => ({
          role: m.role,
          content: m.message,
          timestamp: m.time,
        })) as unknown as Json
      } else if (payload.transcript) {
        // fallback: store as plain text wrapped in array
        transcriptJson = [{ role: 'system', content: payload.transcript }] as unknown as Json
      }

      // Duration from call times
      let durationSeconds: number | null = null
      if (payload.call.startedAt && payload.call.endedAt) {
        const start = new Date(payload.call.startedAt).getTime()
        const end = new Date(payload.call.endedAt).getTime()
        durationSeconds = Math.round((end - start) / 1000)
      }

      // Upsert call record
      const { data: callRecord } = await admin
        .from('calls')
        .upsert({
          workspace_id: workspace.id,
          vapi_call_id: payload.call.id,
          status: 'completed',
          transcript: transcriptJson,
          duration_seconds: durationSeconds,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'vapi_call_id' })
        .select('id')
        .maybeSingle()

      // Enqueue agent job (non-blocking)
      if (callRecord?.id) {
        try {
          await enqueueAgentJob({
            shopId: workspace.id,
            callId: callRecord.id,
            triggerType: 'call_ended',
          })
          console.log(JSON.stringify({
            level: 'info',
            message: 'Agent job enqueued',
            workspaceId: workspace.id,
            callId: callRecord.id,
          }))
        } catch (err) {
          console.error('[vapi/webhook] Failed to enqueue agent job:', err)
        }
      }
      break
    }
  }

  return NextResponse.json({ ok: true })
}
