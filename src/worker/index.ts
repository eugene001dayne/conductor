import { Worker, NativeConnection } from "@temporalio/worker"
import { echo } from "../activities/echo"
import * as dotenv from "dotenv"

dotenv.config()

export async function createWorker(): Promise<Worker> {
  const address = process.env.TEMPORAL_ADDRESS
  const apiKey = process.env.TEMPORAL_API_KEY
  const namespace = process.env.TEMPORAL_NAMESPACE
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? "conductor-task-queue"

  console.log("[CONDUCTOR] Connecting to:", address)

  const connection = await NativeConnection.connect({
    address,
    tls: true,
    metadata: {
      "temporal-namespace": namespace!,
    },
    apiKey: apiKey,
  })

  const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows/echo-workflow"),
    activities: { echo },
    taskQueue,
    connection,
    namespace,
  })

  return worker
}