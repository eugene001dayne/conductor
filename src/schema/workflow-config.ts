import { z } from "zod"

// Schema for a single workflow step
const StepSchema = z.object({
  id: z.string(),
  type: z.string(),
  if: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})

// Schema for the full workflow config
export const WorkflowConfigSchema = z.object({
  name: z.string(),
  version: z.string().default("1.0"),
  on_failure: z.string().optional(),
  steps: z.array(StepSchema),
})

// TypeScript type derived from the schema
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>
export type Step = z.infer<typeof StepSchema>