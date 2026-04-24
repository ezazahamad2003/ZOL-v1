import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BusinessHours } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    name?: string
    humanRedirectNumber?: string
    timezone?: string
    aiTone?: string
  }

  if (!body.name || body.name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

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
      name: body.name.trim(),
      owner_id: user.id,
      human_redirect_number: body.humanRedirectNumber?.trim() || null,
      timezone: body.timezone ?? 'America/Los_Angeles',
      ai_tone: body.aiTone ?? 'professional',
      business_hours: defaultBusinessHours as unknown as import('@/lib/supabase/types').Json,
      status: 'onboarding',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ workspaceId: data.id })
}
