import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google/calendar-client'
import type { Tool, BookAppointmentInput, BookAppointmentOutput, WorkspaceContext, ToolResult } from '../types'
import type { Json } from '@/lib/supabase/types'

export const bookAppointmentTool: Tool<BookAppointmentInput, BookAppointmentOutput> = {
  name: 'book_appointment',
  description: 'Book a new appointment for a customer. Optionally creates a Google Calendar event.',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      callId: { type: 'string', description: 'Optional call ID this appointment originated from' },
      customerName: { type: 'string', description: 'Customer full name' },
      customerPhone: { type: 'string', description: 'Customer phone number' },
      customerEmail: { type: 'string', description: 'Customer email' },
      vehicleInfo: {
        type: 'object',
        description: 'Vehicle details',
        properties: {
          make: { type: 'string' },
          model: { type: 'string' },
          year: { type: 'number' },
          plate: { type: 'string' },
        },
      },
      serviceType: { type: 'string', description: 'Type of service requested' },
      scheduledAt: { type: 'string', description: 'ISO 8601 datetime for the appointment' },
      durationMinutes: { type: 'number', description: 'Duration in minutes (default 60)' },
    },
    required: ['workspaceId', 'customerName', 'serviceType', 'scheduledAt'],
  },

  async execute(input: BookAppointmentInput, _ctx: WorkspaceContext): Promise<ToolResult<BookAppointmentOutput>> {
    const admin = createAdminClient()

    // Calculate end time
    const durationMinutes = input.durationMinutes ?? 60
    const startDate = new Date(input.scheduledAt)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

    // Create the appointment record
    const { data: appointment, error: apptError } = await admin
      .from('appointments')
      .insert({
        workspace_id: input.workspaceId,
        call_id: input.callId ?? null,
        customer_name: input.customerName,
        customer_phone: input.customerPhone ?? null,
        customer_email: input.customerEmail ?? null,
        vehicle_info: (input.vehicleInfo ?? null) as Json,
        service_type: input.serviceType,
        scheduled_at: input.scheduledAt,
        duration_minutes: durationMinutes,
        status: 'scheduled',
      })
      .select('id')
      .single()

    if (apptError || !appointment) {
      return {
        status: 'error',
        output: { appointmentId: '', googleEventId: null },
        error: apptError?.message ?? 'Failed to create appointment',
      }
    }

    // Try to create Google Calendar event
    let googleEventId: string | null = null
    try {
      const vehicleStr = input.vehicleInfo
        ? ` — ${[input.vehicleInfo.year, input.vehicleInfo.make, input.vehicleInfo.model].filter(Boolean).join(' ')}`
        : ''

      googleEventId = await createCalendarEvent(input.workspaceId, {
        summary: `${input.serviceType} — ${input.customerName}${vehicleStr}`,
        description: `Customer: ${input.customerName}\nPhone: ${input.customerPhone ?? 'N/A'}\nEmail: ${input.customerEmail ?? 'N/A'}\nService: ${input.serviceType}`,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        attendeeEmail: input.customerEmail,
      })

      // Update appointment with event ID
      if (googleEventId) {
        await admin
          .from('appointments')
          .update({ google_event_id: googleEventId })
          .eq('id', appointment.id)
      }
    } catch {
      // Google Calendar is optional — don't fail the whole appointment
    }

    return {
      status: 'success',
      output: { appointmentId: appointment.id, googleEventId },
    }
  },
}
