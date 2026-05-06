import { log } from "@temporalio/activity"
import * as dotenv from "dotenv"
dotenv.config()

export interface GeminiGenerateParams {
  prompt: string
  model?: string
  system_instruction?: string
}

export interface GeminiGenerateResult {
  success: boolean
  text?: string
  model?: string
  error?: string
}

export async function geminiGenerate(params: GeminiGenerateParams): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = params.model ?? "gemini-2.0-flash"

  log.info("Gemini connector initiating", { model, prompt_length: params.prompt.length })

  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY not set in environment" }
  }

  try {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey })

    const contents = params.system_instruction
      ? [
          { role: "user", parts: [{ text: params.system_instruction }] },
          { role: "model", parts: [{ text: "Understood. I will follow those instructions." }] },
          { role: "user", parts: [{ text: params.prompt }] },
        ]
      : params.prompt

    const response = await ai.models.generateContent({
      model,
      contents,
    })

    const text = response.text

    log.info("Gemini connector success", { model, response_length: text?.length })
    console.log(`[CONDUCTOR] Gemini (${model}) responded: ${text?.substring(0, 100)}...`)

    return { success: true, text, model }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    log.info("Gemini connector error", { error: message })
    return { success: false, error: `Gemini API error: ${message}` }
  }
}