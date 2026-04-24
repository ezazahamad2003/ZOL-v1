import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent } from '@/lib/google/calendar-client'
import type { Tool, CancelAppointmentInput, CancelAppointmentOutput, WorkspaceContext, ToolResult } from '../types'

export const cancelAppointmentTool: Tool<CancelAppointmentInput, CancelAppointmentOutput> = {
  name: 'cancel_appointment',
  description: 'Cancel an existing appointment and remove from Google Calendar if present.',
  inputSchema: {
    type: 'object',
    properties: {
      appointmentId: { type: 'string', description: 'Appointment ID to cancel' },
      reason: { type: 'string', description: 'Optional reason for cancellation' },
    },
    required: ['appointmentId'],
  },

  async execute(input: CancelAppointmentInput, _ctx: WorkspaceContext): Promise<ToolResult<CancelAppointmentOutput>> {
    const admin = createAdminClient()

    // Fetch appointment to get workspace_id and google_event_id
    const { data: appt, error: fetchErr } = await admin
      .from('appointments')
      .select('id, workspace_id, google_event_id')
      .eq('id', input.appointmentId)
      .single()

    if (fetchErr || !appt) {
      return { status: 'error', output: { success: false }, error: 'Appointment not found' }
    }

    // Update status to cancelled
    const { error: updateErr } = await admin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', input.appointmentId)

    if (updateErr) {
      return { status: 'error', output: { success: false }, error: updateErr.message }
    }

    // Try to delete Google Calendar event
    if (appt.google_event_id) {
      try {
        await deleteCalendarEvent(appt.workspace_id, appt.google_event_id)
      } catch {
        // Non-fatal — appointment already marked cancelled
      }
    }

    return { status: 'success', output: { success: true } }
  },
}
