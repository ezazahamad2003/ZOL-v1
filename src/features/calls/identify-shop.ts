/**
 * Identifies which workspace a Vapi webhook belongs to
 * by looking up vapi_phone_number_id in the workspaces table.
 * Uses admin client — this runs in webhook route (unauthenticated).
 *
 * @deprecated Use inline query in vapi webhook route instead.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/lib/supabase/types'

export async function identifyShopByPhoneNumberId(
  vapiPhoneNumberId: string
): Promise<Workspace | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('workspaces')
    .select('*')
    .eq('vapi_phone_number_id', vapiPhoneNumberId)
    .maybeSingle()

  if (error) {
    console.error('[identify-shop] DB error:', error)
    return null
  }

  return data
}
