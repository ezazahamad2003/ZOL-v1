import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'ws-123', name: "Dave's Auto", vapi_phone_number_id: 'ph_abc' },
            error: null,
          })
        })
      })
    })
  })
}))

const { identifyShopByPhoneNumberId } = await import('@/features/calls/identify-shop')

describe('identifyShopByPhoneNumberId', () => {
  it('returns a workspace when found', async () => {
    const workspace = await identifyShopByPhoneNumberId('ph_abc')
    expect(workspace).not.toBeNull()
    expect(workspace?.id).toBe('ws-123')
  })
})
