import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, CheckAvailabilityInput, CheckAvailabilityOutput, WorkspaceContext, ToolResult } from '../types'

export const checkAvailabilityTool: Tool<CheckAvailabilityInput, CheckAvailabilityOutput> = {
  name: 'check_availability',
  description: 'Check available appointment slots for a given date. Returns open time slots.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      date: { type: 'string', description: 'Date to check in YYYY-MM-DD format' },
      durationMinutes: { type: 'number', description: 'Appointment duration in minutes (default 60)' },
    },
    required: ['workspaceId', 'date'],
  },

  async execute(input: CheckAvailabilityInput, ctx: WorkspaceContext): Promise<ToolResult<CheckAvailabilityOutput>> {
    const admin = createAdminClient()
    const durationMinutes = input.durationMinutes ?? 60

    // Fetch existing appointments for that day
    const dayStart = `${input.date}T00:00:00Z`
    const dayEnd = `${input.date}T23:59:59Z`

    const { data: existing } = await admin
      .from('appointments')
      .select('scheduled_at, duration_minutes')
      .eq('workspace_id', input.workspaceId)
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .in('status', ['scheduled'])

    // Build list of busy windows
    const busyWindows = (existing ?? []).map((a) => {
      const start = new Date(a.scheduled_at).getTime()
      const end = start + a.duration_minutes * 60 * 1000
      return { start, end }
    })

    // Generate candidate slots every 60 minutes from 08:00 to 17:00 local
    const slots: string[] = []
    const businessHours = ctx.businessHours
    const dayKey = new Date(input.date).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() as keyof typeof businessHours

    const dayHours = businessHours[dayKey]
    const openHour = dayHours ? parseInt(dayHours.open.split(':')[0] ?? '8') : 8
    const closeHour = dayHours ? parseInt(dayHours.close.split(':')[0] ?? '17') : 17

    for (let hour = openHour; hour + durationMinutes / 60 <= closeHour; hour++) {
      const slotStart = new Date(`${input.date}T${String(hour).padStart(2, '0')}:00:00`)
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
      const slotStartMs = slotStart.getTime()
      const slotEndMs = slotEnd.getTime()

      const isConflict = busyWindows.some(
        (w) => slotStartMs < w.end && slotEndMs > w.start
      )

      if (!isConflict) {
        slots.push(slotStart.toISOString())
      }
    }

    return {
      status: 'success',
      output: {
        available: slots.length > 0,
        slots,
      },
    }
  },
}
