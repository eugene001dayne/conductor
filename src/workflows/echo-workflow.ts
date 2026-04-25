import { proxyActivities } from "@temporalio/workflow"
import type { WorkflowConfig } from "../schema/workflow-config"
import type { SafeProposeParams, SafeProposeResult } from "../activities/safe-multisig"

const activities = proxyActivities<{
  echo: (params: { message: string }) => Promise<string>
  safePropose: (params: SafeProposeParams) => Promise<SafeProposeResult>
}>({
  startToCloseTimeout: "60 seconds",
})

export async function conductorWorkflow(config: WorkflowConfig): Promise<string[]> {
  const results: string[] = []

  for (const step of config.steps) {
    if (step.type === "echo") {
      const message = (step.params?.message as string) ?? "no message"
      const result = await activities.echo({ message })
      results.push(result)
    }

    if (step.type === "safe.propose") {
      const result = await activities.safePropose({
        to: step.params?.to as string,
        value_eth: step.params?.value_eth as string,
        data: step.params?.data as string | undefined,
      })
      results.push(`Safe tx proposed: ${result.safeTxHash}`)
    }
  }

  return results
}