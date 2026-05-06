import * as dotenv from "dotenv"
dotenv.config()

import { Client, Connection } from "@temporalio/client"
import { createWorker } from "./worker/index"
import { WorkflowConfigSchema } from "./schema/workflow-config"
import { conductorWorkflow } from "./workflows/echo-workflow"
import * as yaml from "js-yaml"
import * as fs from "fs"
import * as path from "path"

async function run() {
  console.log("[CONDUCTOR] Starting worker...")

  const worker = await createWorker()

  // In worker-only mode (Docker), just run the worker and wait for workflows
  // In dev mode, also trigger a test workflow
  const devMode = process.env.CONDUCTOR_DEV_MODE === "true"

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS,
    apiKey: process.env.TEMPORAL_API_KEY,
    tls: true,
  })

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE,
  })

  if (devMode) {
    const yamlPath = path.resolve(__dirname, "../examples/gemini-test.yml")
    const raw = fs.readFileSync(yamlPath, "utf8")
    const parsed = yaml.load(raw)
    const config = WorkflowConfigSchema.parse(parsed)

    console.log(`[CONDUCTOR] Dev mode — loaded workflow: ${config.name}`)

    await Promise.all([
      worker.run(),
      (async () => {
        await new Promise((res) => setTimeout(res, 1000))
        console.log("[CONDUCTOR] Triggering workflow...")
        const handle = await client.workflow.start(conductorWorkflow, {
          args: [config],
          taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "conductor-task-queue",
          workflowId: `conductor-${Date.now()}`,
        })
        const results = await handle.result()
        console.log("[CONDUCTOR] Workflow complete. Results:", results)
        process.exit(0)
      })(),
    ])
  } else {
    console.log("[CONDUCTOR] Worker mode — waiting for workflows...")
    await worker.run()
  }
}

run().catch((err) => {
  console.error("[CONDUCTOR] Fatal error:", err)
  process.exit(1)
})