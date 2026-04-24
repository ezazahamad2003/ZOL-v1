import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { provisionWorkspace } from '@/lib/vapi/provisioning'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { workspaceId?: string; shopId?: string }
  const workspaceId = body.workspaceId ?? body.shopId

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  // Verify ownership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  try {
    const result = await provisionWorkspace(workspaceId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Provisioning failed'
    console.error('[onboarding/provision]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
