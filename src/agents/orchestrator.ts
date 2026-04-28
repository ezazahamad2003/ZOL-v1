/**
 * Agent orchestrator — PLAN → TOOL_CALL → OBSERVE → FINISH loop.
 *
 * Uses OpenAI GPT-4o function calling API.
 * Every step is persisted to agent_steps table.
 */

import type OpenAI from 'openai'
import { getOpenAIClient } from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, WorkspaceContext, OrchestratorResult } from './types'

const MAX_ITERATIONS = 15
const MODEL = 'gpt-4o'

type AnyTool = Tool<unknown, unknown>

function buildSystemPrompt(ctx: WorkspaceContext): string {
  return `You are ZOL, an agentic AI assistant for ${ctx.workspaceName}.
You help the workspace owner manage calls, appointments, follow-ups, and customer insights.

Workspace ID: ${ctx.workspaceId}
Workspace Name: ${ctx.workspaceName}

When given a task:
1. Think about what tools you need to accomplish it
2. Call tools one at a time, using outputs from previous calls as inputs
3. When all necessary work is done, provide a concise summary of what you accomplished

Always be helpful, accurate, and concise in your final response.`
}

function toolsToOpenAIFormat(tools: AnyTool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema as Record<string, unknown>,
    },
  }))
}

async function saveStep(params: {
  runId: string
  stepNumber: number
  stepType: 'plan' | 'tool_call' | 'observe' | 'finish'
  toolName?: string
  toolInput?: unknown
  toolOutput?: unknown
  durationMs?: number
  status: 'success' | 'error'
  errorMessage?: string
}): Promise<void> {
  const admin = createAdminClient()
  await admin.from('agent_steps').insert({
    run_id: params.runId,
    step_number: params.stepNumber,
    step_type: params.stepType,
    tool_name: params.toolName ?? null,
    tool_input: params.toolInput !== undefined ? (params.toolInput as import('@/lib/supabase/types').Json) : null,
    tool_output: params.toolOutput !== undefined ? (params.toolOutput as import('@/lib/supabase/types').Json) : null,
    duration_ms: params.durationMs ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
  })
}

export async function runOrchestrator(params: {
  runId: string
  ctx: WorkspaceContext
  userPrompt: string
  tools: AnyTool[]
}): Promise<OrchestratorResult> {
  const { runId, ctx, userPrompt, tools } = params
  const openai = getOpenAIClient()
  const admin = createAdminClient()

  const toolMap = new Map<string, AnyTool>(tools.map((t) => [t.name, t]))
  const openaiTools = toolsToOpenAIFormat(tools)
  const systemPrompt = buildSystemPrompt(ctx)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  let stepNum = 0
  let totalToolCalls = 0
  let finalResult: unknown = null

  // Update run started_at
  await admin
    .from('agent_runs')
    .update({ started_at: new Date().toISOString(), status: 'running' })
    .eq('id', runId)

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
      })

      const message = response.choices[0].message
      const finishReason = response.choices[0].finish_reason
      const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0)

      // Add assistant message to history
      messages.push(message)

      // Log reasoning text if present
      if (message.content) {
        stepNum++
        await saveStep({
          runId,
          stepNumber: stepNum,
          stepType: hasToolCalls ? 'plan' : 'finish',
          toolOutput: { text: message.content },
          status: 'success',
        })
      }

      if (finishReason === 'stop' || !hasToolCalls) {
        finalResult = message.content ?? null
        break
      }

      // Execute tool calls — filter to standard function calls only
      for (const toolCall of message.tool_calls!) {
        if (toolCall.type !== 'function') continue
        const toolName = toolCall.function.name
        let toolInput: Record<string, unknown> = {}
        try {
          toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        } catch { /* leave as empty object */ }

        const tool = toolMap.get(toolName)
        stepNum++
        totalToolCalls++

        const stepStart = Date.now()
        let toolOutput: unknown = null
        let toolError: string | undefined

        if (!tool) {
          toolError = `Unknown tool: ${toolName}`
        } else {
          try {
            const result = await tool.execute(toolInput, ctx)
            toolOutput = result.output
            if (result.status === 'error') {
              toolError = result.error
            }
          } catch (err) {
            toolError = err instanceof Error ? err.message : String(err)
          }
        }

        const durationMs = Date.now() - stepStart

        await saveStep({
          runId,
          stepNumber: stepNum,
          stepType: 'tool_call',
          toolName,
          toolInput,
          toolOutput: toolError ? { error: toolError } : toolOutput,
          durationMs,
          status: toolError ? 'error' : 'success',
          errorMessage: toolError,
        })

        // Append tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolError
            ? JSON.stringify({ error: toolError })
            : JSON.stringify(toolOutput),
        })
      }

      // OBSERVE step
      stepNum++
      await saveStep({
        runId,
        stepNumber: stepNum,
        stepType: 'observe',
        toolOutput: { tool_results_count: totalToolCalls },
        status: 'success',
      })
    }

    // FINISH
    await admin
      .from('agent_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        total_tool_calls: totalToolCalls,
      })
      .eq('id', runId)

    return { status: 'completed', totalToolCalls, result: finalResult }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    await admin
      .from('agent_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        total_tool_calls: totalToolCalls,
      })
      .eq('id', runId)

    stepNum++
    await saveStep({
      runId,
      stepNumber: stepNum,
      stepType: 'finish',
      status: 'error',
      errorMessage: errorMsg,
    })

    return { status: 'failed', totalToolCalls, result: null, error: errorMsg }
  }
}
