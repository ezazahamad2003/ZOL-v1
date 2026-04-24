// OpenAI removed in MVP1 — replaced by Anthropic. This file is kept as a
// placeholder so any stale imports fail with a clear runtime error rather than
// a module-not-found crash during the transition period.
export function getOpenAIClient(): never {
  throw new Error(
    'OpenAI has been removed from ZOL MVP1. Use getAnthropicClient() from @/lib/anthropic/client instead.'
  )
}
