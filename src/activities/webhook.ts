import { log } from "@temporalio/activity"
import * as dotenv from "dotenv"

dotenv.config()

export interface WebhookParams {
  url: string
  payload: Record<string, unknown>
}

export interface WebhookResult {
  status: number
  success: boolean
  url: string
}

export async function webhookSend(params: WebhookParams): Promise<WebhookResult> {
  const { default: fetch } = await import("node-fetch")

  log.info("Webhook sending", { url: params.url })

  const response = await fetch(params.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "CONDUCTOR",
      timestamp: new Date().toISOString(),
      ...params.payload,
    }),
  })

  const success = response.ok
  log.info("Webhook response", { status: response.status, success })
  console.log(`[CONDUCTOR] Webhook sent to ${params.url} — status ${response.status}`)

  return { status: response.status, success, url: params.url }
}