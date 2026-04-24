import { runIntakeAgent } from '@/agents/intake-agent'

export interface WorkerPayload {
  workspaceId: string
  callId: string
  triggerType: 'call_ended' | 'manual' | 'scheduled'
}

export async function handleAgentJob(payload: WorkerPayload): Promise<void> {
  const { workspaceId, callId, triggerType } = payload

  console.log(JSON.stringify({
    level: 'info',
    message: 'Agent worker: received job',
    workspaceId,
    callId,
    triggerType,
  }))

  if (triggerType === 'call_ended' || triggerType === 'manual') {
    await runIntakeAgent(workspaceId, callId)
  } else {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'Unhandled trigger type',
      triggerType,
    }))
  }

  console.log(JSON.stringify({
    level: 'info',
    message: 'Agent worker: job complete',
    workspaceId,
    callId,
  }))
}
