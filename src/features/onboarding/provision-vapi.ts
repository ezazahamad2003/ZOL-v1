'use server'

import { provisionWorkspace } from '@/lib/vapi/provisioning'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function provisionVapiAction(formData: FormData) {
  const workspaceId = formData.get('workspaceId') as string ?? formData.get('shopId') as string
  if (!workspaceId) return { error: 'Missing workspace ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const result = await provisionWorkspace(workspaceId)
    return { success: true, phoneNumber: result.phoneNumber }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to provision phone number',
    }
  }
}
