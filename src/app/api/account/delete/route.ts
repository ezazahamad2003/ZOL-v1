import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deletePhoneNumber, deleteAssistant } from '@/lib/vapi/client'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch workspace to get VAPI IDs before deleting anything
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, vapi_phone_number_id, vapi_assistant_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  const errors: string[] = []

  // Delete VAPI phone number if provisioned
  if (workspace?.vapi_phone_number_id) {
    try {
      await deletePhoneNumber(workspace.vapi_phone_number_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[account/delete] VAPI phone deletion failed:', msg)
      errors.push(`VAPI phone: ${msg}`)
    }
  }

  // Delete VAPI assistant if provisioned
  if (workspace?.vapi_assistant_id) {
    try {
      await deleteAssistant(workspace.vapi_assistant_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[account/delete] VAPI assistant deletion failed:', msg)
      errors.push(`VAPI assistant: ${msg}`)
    }
  }

  // Delete the Supabase auth user — cascades to workspaces and all related tables
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)

  if (deleteErr) {
    console.error('[account/delete] Auth user deletion failed:', deleteErr.message)
    return NextResponse.json(
      { error: `Failed to delete account: ${deleteErr.message}`, vapiErrors: errors },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, vapiErrors: errors })
}
