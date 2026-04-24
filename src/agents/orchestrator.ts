/**
 * Agent orchestrator — PLAN → TOOL_CALL → OBSERVE → FINISH loop.
 *
 * Uses Anthropic Claude tool_use API.
 * Every step is persisted to agent_steps table (not JSONB in agent_runs).
 */

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tool, WorkspaceContext, OrchestratorResult } from './types'

const MAX_ITERATIONS = 15
const MODEL = 'claude-opus-4-5'

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

function toolsToAnthropicFormat(tools: AnyTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
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
  const anthropic = getAnthropicClient()
  const admin = createAdminClient()

  const toolMap = new Map<string, AnyTool>(tools.map((t) => [t.name, t]))
  const anthropicTools = toolsToAnthropicFormat(tools)
  const systemPrompt = buildSystemPrompt(ctx)

  const messages: Anthropic.MessageParam[] = [
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
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: anthropicTools,
        tool_choice: { type: 'auto' },
      })

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: response.content })

      const hasToolUse = response.content.some((b) => b.type === 'tool_use')

      // PLAN step — log the text reasoning if present
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock && textBlock.type === 'text' && textBlock.text) {
        stepNum++
        await saveStep({
          runId,
          stepNumber: stepNum,
          stepType: hasToolUse ? 'plan' : 'finish',
          toolOutput: { text: textBlock.text },
          status: 'success',
        })
      }

      if (response.stop_reason === 'end_turn' || !hasToolUse) {
        finalResult = textBlock?.text ?? null
        break
      }

      // Execute tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        const toolName = block.name
        const toolInput = block.input as Record<string, unknown>
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

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: toolError
            ? JSON.stringify({ error: toolError })
            : JSON.stringify(toolOutput),
          is_error: !!toolError,
        })
      }

      // Append tool results to messages
      messages.push({ role: 'user', content: toolResults })

      // OBSERVE step
      stepNum++
      await saveStep({
        runId,
        stepNumber: stepNum,
        stepType: 'observe',
        toolOutput: { tool_results_count: toolResults.length },
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
