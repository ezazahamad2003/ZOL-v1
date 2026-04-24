import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/google/oauth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

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

  const url = getAuthorizationUrl(workspaceId)
  return NextResponse.json({ url })
}
