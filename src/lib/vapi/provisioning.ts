/**
 * Provisions Vapi resources for a workspace:
 * 1. Buy a US phone number
 * 2. Create an assistant with workspace-specific system prompt
 * 3. Link the assistant to the phone number
 * 4. Update the workspaces row with Vapi IDs
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { purchasePhoneNumber, createAssistant, linkAssistantToPhoneNumber } from './client'
import { normalizeToE164 } from './phone-e164'
import type { BusinessHours } from '@/lib/supabase/types'

function resolveVapiFallbackE164(workspace: {
  human_redirect_number: string | null
}): string {
  const fromWorkspace = normalizeToE164(workspace.human_redirect_number)
  const fromEnv = normalizeToE164(process.env.VAPI_FALLBACK_E164)
  const resolved = fromWorkspace ?? fromEnv
  if (!resolved) {
    throw new Error(
      'Vapi needs a real fallback phone in E.164. Add "Human redirect / staff number" when creating your workspace (e.g. +14155552671), or set VAPI_FALLBACK_E164 in your environment.'
    )
  }
  return resolved
}

function buildSystemPrompt(params: {
  workspaceName: string
  businessHours: BusinessHours
  humanRedirectNumber: string
  aiGreeting?: string | null
  aiTone?: string
}): string {
  const { workspaceName, humanRedirectNumber, aiGreeting, aiTone = 'professional' } = params

  const greeting = aiGreeting ?? `Thank you for calling ${workspaceName}. How can I help you today?`

  return `You are the AI receptionist for ${workspaceName}, an auto mechanic shop.
Tone: ${aiTone}
Greeting: "${greeting}"

Your job is to handle calls professionally and helpfully.

WHEN TO REDIRECT:
- During business hours: politely redirect to ${humanRedirectNumber || 'our staff'}

WHAT TO COLLECT FROM EVERY CALLER:
1. Full name
2. Best callback phone number
3. Email address (for follow-ups)
4. Vehicle: year, make, model, license plate
5. Description of the issue or service needed
6. Urgency level
7. Preferred appointment time if applicable

CONVERSATION STYLE:
- ${aiTone.charAt(0).toUpperCase() + aiTone.slice(1)}, helpful, and efficient
- Ask one question at a time
- Confirm details back to the caller
- Reassure them their information will be reviewed and someone will follow up

CLOSING:
Once you have all the information, thank the caller, confirm you'll pass the details to the team, and let them know someone will follow up shortly. End the call politely.

IMPORTANT: Never make up prices, estimates, or availability. You are collecting information only.`
}

export async function provisionWorkspace(workspaceId: string): Promise<{
  phoneNumber: string
  vapiPhoneNumberId: string
  vapiAssistantId: string
}> {
  const admin = createAdminClient()

  // 1. Fetch workspace
  const { data: workspace, error: wsErr } = await admin
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (wsErr || !workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  const systemPrompt = buildSystemPrompt({
    workspaceName: workspace.name,
    businessHours: (workspace.business_hours as BusinessHours) ?? {},
    humanRedirectNumber: workspace.human_redirect_number ?? '',
    aiGreeting: workspace.ai_greeting,
    aiTone: workspace.ai_tone,
  })

  // 2. Buy phone number (Vapi requires a valid E.164 fallback)
  const fallbackE164 = resolveVapiFallbackE164(workspace)
  const phoneNumberRes = await purchasePhoneNumber({ fallbackE164 })

  // 3. Create assistant
  const assistantRes = await createAssistant({
    name: `${workspace.name} AI Receptionist`,
    systemPrompt,
  })

  // 4. Link assistant to phone number
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  const webhookUrl =
    process.env.VAPI_WEBHOOK_URL?.trim() ||
    (appOrigin ? `${appOrigin}/api/vapi/webhook` : '')

  if (!webhookUrl.startsWith('https://')) {
    throw new Error(
      'Vapi requires an https:// webhook URL. Set VAPI_WEBHOOK_URL or NEXT_PUBLIC_APP_URL (must be https) in your environment.'
    )
  }

  await linkAssistantToPhoneNumber(phoneNumberRes.id, assistantRes.id, webhookUrl)

  // 5. Update workspace in DB
  const { error: updateErr } = await admin
    .from('workspaces')
    .update({
      vapi_phone_number_id: phoneNumberRes.id,
      vapi_assistant_id: assistantRes.id,
      vapi_phone_number: phoneNumberRes.number,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)

  if (updateErr) {
    throw new Error(`Failed to update workspace after provisioning: ${updateErr.message}`)
  }

  return {
    phoneNumber: phoneNumberRes.number,
    vapiPhoneNumberId: phoneNumberRes.id,
    vapiAssistantId: assistantRes.id,
  }
}

// Keep backwards compat alias
export const provisionShop = provisionWorkspace
