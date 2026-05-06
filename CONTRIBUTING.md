# Contributing to CONDUCTOR

Thank you for your interest in CONDUCTOR. This document tells you exactly how to add a connector, fix a bug, or improve the project.

---

## What We Are Building

CONDUCTOR is an open-source workflow engine that lets AI agents orchestrate Web3 actions using YAML files. Every contribution that makes it easier for developers to connect AI agents to Web3 systems moves the project forward.

---

## The Connector Pattern

Every connector in CONDUCTOR follows the same four-file pattern. Understanding this pattern is all you need to contribute.

### Step 1 — Create the activity file

Create `src/activities/your-connector.ts`:

```typescript
import { log } from "@temporalio/activity"
import * as dotenv from "dotenv"
dotenv.config()

// Define what your connector accepts
export interface YourConnectorParams {
  param_one: string
  param_two: number
}

// Define what your connector returns
export interface YourConnectorResult {
  success: boolean
  data?: string
  error?: string
}

// The activity function — this is what Temporal executes
export async function yourConnector(params: YourConnectorParams): Promise<YourConnectorResult> {
  log.info("Your connector initiating", { param_one: params.param_one })

  try {
    // Your connector logic here
    // Call an API, query a contract, send a transaction, etc.

    console.log(`[CONDUCTOR] Your connector executed successfully`)
    return { success: true, data: "result" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}
```

### Step 2 — Register the activity in the worker

Open `src/worker/index.ts` and add two lines:

```typescript
// Add this import at the top
import { yourConnector } from "../activities/your-connector"

// Add yourConnector to the activities object in Worker.create()
activities: { echo, safePropose, webhookSend, x402Verify, erc8004Check, yourConnector },
```

### Step 3 — Add the connector to the workflow router

Open `src/workflows/echo-workflow.ts` and add two things:

At the top with the other imports:
```typescript
import type { YourConnectorParams, YourConnectorResult } from "../activities/your-connector"
```

In the `proxyActivities` type block:
```typescript
yourConnector: (params: YourConnectorParams) => Promise<YourConnectorResult>
```

In the `conductorWorkflow` for loop:
```typescript
if (step.type === "your.connector") {
  const result = await activities.yourConnector({
    param_one: step.params?.param_one as string,
    param_two: step.params?.param_two as number,
  })
  context[step.id] = { ...result }
  results.push(`Your connector: ${result.success}`)
}
```

### Step 4 — Add an example YAML

Create `examples/your-connector-example.yml`:

```yaml
name: your-connector-test
version: "1.0"

steps:
  - id: step-1
    type: echo
    params:
      message: "Testing your connector."

  - id: step-2
    type: your.connector
    if: "step-1.success"
    params:
      param_one: "hello"
      param_two: 42

  - id: step-3
    type: echo
    if: "step-2.success"
    params:
      message: "Your connector worked."
```

### Step 5 — Test it

Update the `yamlPath` in `src/index.ts` to point to your example file, then run:

```bash
pnpm dev
```

Confirm your connector executes and returns the expected result. Nothing gets submitted until it runs.

---

## Conditional Logic

Every step can have an `if:` field that references the result of a previous step:

```yaml
if: "step-id.field"       # runs if step-id.field is truthy
if: "step-id.success"     # runs if step-id returned success: true
if: "step-id.verified"    # runs if step-id returned verified: true
```

The condition uses dot notation to traverse the result object stored in `context[step.id]`. Design your result interfaces with this in mind — boolean fields like `success`, `verified`, `registered` are the cleanest conditions.

---

## Code Standards

- TypeScript strict mode. No `any` unless absolutely necessary and documented.
- Every activity must have typed params and result interfaces.
- Every activity must use `log.info()` from `@temporalio/activity` for structured logging.
- Every activity must handle errors and return a result object — never throw unhandled.
- Comments must explain why, not what.
- Nothing gets committed until it runs.

---

## Submitting a Pull Request

1. Fork the repository
2. Create a branch: `git checkout -b connector/your-connector-name`
3. Build your connector following the four-step pattern above
4. Run `pnpm dev` and confirm it works end to end
5. Run `pnpm build` and confirm TypeScript compiles clean
6. Push your branch and open a pull request
7. In the PR description, include: what the connector does, what external system it connects to, and the output of `pnpm dev` showing it working

---

## Project Setup for Contributors

```bash
git clone https://github.com/eugene001dayne/conductor.git
cd conductor
pnpm install
cp .env.example .env
# Fill in your .env values — see README for what each variable does
pnpm dev
```

Requirements: Node.js 20+, pnpm, a Temporal Cloud account (free tier works), an Alchemy Sepolia RPC URL.

---

## Questions

Open an issue on GitHub. Describe what you are trying to build and what connector you want to add. We will help you get there.

---

*CONDUCTOR is MIT licensed. Build freely.*