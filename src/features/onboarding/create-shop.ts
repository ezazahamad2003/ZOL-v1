'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { BusinessHours, Json } from '@/lib/supabase/types'

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  humanRedirectNumber: z.string().optional(),
  timezone: z.string().default('America/Los_Angeles'),
})

export async function createWorkspaceAction(_prevState: unknown, formData: FormData) {
  const raw = {
    name: formData.get('name'),
    phoneNumber: formData.get('phoneNumber') || undefined,
    humanRedirectNumber: formData.get('humanRedirectNumber') || undefined,
    timezone: formData.get('timezone') || 'America/Los_Angeles',
  }

  const parsed = CreateWorkspaceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const defaultBusinessHours: BusinessHours = {
    mon: { open: '08:00', close: '17:00' },
    tue: { open: '08:00', close: '17:00' },
    wed: { open: '08:00', close: '17:00' },
    thu: { open: '08:00', close: '17:00' },
    fri: { open: '08:00', close: '17:00' },
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: parsed.data.name,
      owner_id: user.id,
      phone_number: parsed.data.phoneNumber ?? null,
      human_redirect_number: parsed.data.humanRedirectNumber ?? null,
      timezone: parsed.data.timezone,
      business_hours: defaultBusinessHours as unknown as Json,
      status: 'onboarding',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  redirect(`/onboarding?workspaceId=${data.id}&step=vapi`)
}

// Alias so any remaining pages still importing createShopAction keep compiling
export const createShopAction = createWorkspaceAction
