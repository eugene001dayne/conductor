import { proxyActivities } from "@temporalio/workflow"
import type { WorkflowConfig } from "../schema/workflow-config"
import type { SafeProposeParams, SafeProposeResult } from "../activities/safe-multisig"
import type { WebhookParams, WebhookResult } from "../activities/webhook"

const activities = proxyActivities<{
  echo: (params: { message: string }) => Promise<string>
  safePropose: (params: SafeProposeParams) => Promise<SafeProposeResult>
  webhookSend: (params: WebhookParams) => Promise<WebhookResult>
}>({
  startToCloseTimeout: "60 seconds",
})

// Evaluate a simple condition string against step results
function evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
  if (!condition) return true
  const parts = condition.split(".")
  let value: unknown = context
  for (const part of parts) {
    if (typeof value === "object" && value !== null) {
      value = (value as Record<string, unknown>)[part]
    } else {
      return false
    }
  }
  return Boolean(value)
}

export async function conductorWorkflow(config: WorkflowConfig): Promise<string[]> {
  const results: string[] = []
  const context: Record<string, unknown> = {}

  for (const step of config.steps) {
    // Check conditional — skip step if condition not met
    if (step.if) {
      const shouldRun = evaluateCondition(step.if, context)
      if (!shouldRun) {
        console.log(`[CONDUCTOR] Skipping step ${step.id} — condition not met: ${step.if}`)
        results.push(`Skipped: ${step.id}`)
        continue
      }
    }

    if (step.type === "echo") {
      const message = (step.params?.message as string) ?? "no message"
      const result = await activities.echo({ message })
      context[step.id] = { success: true, result }
      results.push(result)
    }

    if (step.type === "safe.propose") {
      const result = await activities.safePropose({
        to: step.params?.to as string,
        value_eth: step.params?.value_eth as string,
        data: step.params?.data as string | undefined,
      })
      context[step.id] = { success: true, ...result }
      results.push(`Safe tx proposed: ${result.safeTxHash}`)
    }

    if (step.type === "webhook") {
      const result = await activities.webhookSend({
        url: step.params?.url as string,
        payload: (step.params?.payload as Record<string, unknown>) ?? {},
      })
      context[step.id] = { success: result.success, status: result.status }
      results.push(`Webhook sent: ${result.status}`)
    }
  }

  return results
}