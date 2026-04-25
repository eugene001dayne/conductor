import { log } from "@temporalio/activity"

export interface EchoParams {
  message: string
}

// Echo activity — logs a message and returns it
// This is Phase 1's test activity. Every real connector follows this same pattern.
export async function echo(params: EchoParams): Promise<string> {
  log.info("Echo activity executing", { message: params.message })
  console.log(`[CONDUCTOR] ${params.message}`)
  return params.message
}