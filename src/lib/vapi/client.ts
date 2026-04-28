/**
 * Vapi REST API wrapper.
 * Uses org-level VAPI_API_KEY from env.
 * Per-shop Vapi IDs are stored in the shops table.
 */

import type { VapiPhoneNumberResponse, VapiAssistantResponse } from './types'

const BASE_URL = 'https://api.vapi.ai'

function getApiKey(): string {
  const key = process.env.VAPI_API_KEY
  if (!key) throw new Error('VAPI_API_KEY is not set')
  return key
}

async function vapiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vapi API error ${res.status} on ${method} ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}

/**
 * Try area codes in order until Vapi accepts one.
 * Falls back to omitting numberDesiredAreaCode entirely so Vapi picks any available US number.
 */
const AREA_CODE_FALLBACKS = ['734', '708', '903', '512', '737', '972', '469', '214']

export async function purchasePhoneNumber(params: {
  areaCode?: string
  /** E.164 (e.g. +14155552671). Required by Vapi when creating a phone number. */
  fallbackE164: string
}): Promise<VapiPhoneNumberResponse> {
  const fallback = params.fallbackE164.trim()
  if (!fallback.startsWith('+') || fallback.length < 11) {
    throw new Error(
      'fallbackE164 must be E.164 (e.g. +14155552671) for Vapi phone provisioning'
    )
  }

  const codestoTry = params.areaCode
    ? [params.areaCode, ...AREA_CODE_FALLBACKS]
    : AREA_CODE_FALLBACKS

  // Try each area code; on "area code not available" move to the next one
  for (const code of codestoTry) {
    try {
      return await vapiRequest<VapiPhoneNumberResponse>('POST', '/phone-number', {
        provider: 'vapi',
        numberDesiredAreaCode: code,
        fallbackDestination: { type: 'number', number: fallback },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('area code') && msg.toLowerCase().includes('not available')) {
        continue // try next code
      }
      throw err // unrelated error — rethrow immediately
    }
  }

  // Final attempt: let Vapi assign any available US number
  return vapiRequest<VapiPhoneNumberResponse>('POST', '/phone-number', {
    provider: 'vapi',
    fallbackDestination: { type: 'number', number: fallback },
  })
}

export async function createAssistant(params: {
  name: string
  systemPrompt: string
}): Promise<VapiAssistantResponse> {
  return vapiRequest<VapiAssistantResponse>('POST', '/assistant', {
    name: params.name,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      systemPrompt: params.systemPrompt,
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova',
    },
    firstMessage: 'Thank you for calling. How can I help you today?',
    endCallFunctionEnabled: true,
  })
}

export async function linkAssistantToPhoneNumber(
  phoneNumberId: string,
  assistantId: string,
): Promise<VapiPhoneNumberResponse> {
  return vapiRequest<VapiPhoneNumberResponse>('PATCH', `/phone-number/${phoneNumberId}`, {
    assistantId,
  })
}


export async function deletePhoneNumber(phoneNumberId: string): Promise<void> {
  await vapiRequest<unknown>('DELETE', `/phone-number/${phoneNumberId}`)
}

export async function deleteAssistant(assistantId: string): Promise<void> {
  await vapiRequest<unknown>('DELETE', `/assistant/${assistantId}`)
}
