import { proxyActivities } from "@temporalio/workflow"
import type { WorkflowConfig } from "../schema/workflow-config"

// Import activities via proxy — this is how Temporal isolates workflow from activity code
const { echo } = proxyActivities<{ echo: (params: { message: string }) => Promise<string> }>({
  startToCloseTimeout: "10 seconds",
})

// Main workflow — reads the config and executes each step in order
export async function conductorWorkflow(config: WorkflowConfig): Promise<string[]> {
  const results: string[] = []

  for (const step of config.steps) {
    if (step.type === "echo") {
      const message = (step.params?.message as string) ?? "no message"
      const result = await echo({ message })
      results.push(result)
    }
  }

  return results
}