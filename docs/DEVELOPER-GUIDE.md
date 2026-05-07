# CONDUCTOR Developer Guide

## Everything you need to clone, run, extend, and integrate CONDUCTOR

---

## What is CONDUCTOR?

CONDUCTOR is an open-source workflow engine that lets AI agents orchestrate actions across Web3 systems using simple YAML files. No custom code required to deploy a workflow.

You define what you want to happen in a YAML file. CONDUCTOR reads it, executes each step in order, handles retries automatically if anything fails, and passes results between steps. Each step can be conditional on the success of the previous one.

A full agent flow looks like this:

```yaml
name: full-agent-flow
version: "1.0"

steps:
  - id: verify-payment
    type: x402.verify
    params:
      payment_header: "x402-USDC-10.00-0xYourPayerAddress"
      amount_usd: 10.00
      token: "USDC"

  - id: check-identity
    type: erc8004.check
    if: "verify-payment.verified"
    params:
      agent_address: "0xYourAgentAddress"
      min_reputation: 0

  - id: notify
    type: webhook
    if: "check-identity.verified"
    params:
      url: "https://your-endpoint.com/webhook"
      payload:
        event: "agent.verified"
        message: "Agent cleared to proceed."

  - id: done
    type: echo
    if: "notify.success"
    params:
      message: "Flow complete."
```

Each step only runs if the previous step succeeded. If any step fails, subsequent steps are skipped. Temporal handles all retry logic automatically.

---

## Prerequisites

- **Node.js** 20 or higher
- **pnpm** — `npm install -g pnpm`
- **Temporal Cloud account** — free at https://cloud.temporal.io
- **Alchemy account** — free at https://alchemy.com (for Sepolia RPC)
- **MetaMask wallet** with Sepolia test ETH — free from https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- **Safe multisig wallet** on Sepolia — free at https://app.safe.global (only needed for `safe.propose` connector)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/eugene001dayne/conductor.git
cd conductor
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Temporal Cloud — get from cloud.temporal.io
TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace.tmprl.cloud
TEMPORAL_API_KEY=your-temporal-api-key

# Task queue — leave as is
TEMPORAL_TASK_QUEUE=conductor-task-queue

# Safe wallet address on Sepolia — from app.safe.global
SAFE_ADDRESS=0xYourSafeAddress

# Alchemy Sepolia RPC — from alchemy.com
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key

# Your wallet private key — NEVER commit this
SIGNER_PRIVATE_KEY=your-private-key
```

### 4. Get your Temporal Cloud credentials

1. Go to https://cloud.temporal.io
2. Create a namespace (any name, any region)
3. Go to your namespace → Settings → API Keys → Generate API Key
4. Copy the endpoint shown — it looks like `your-namespace.tmprl.cloud:7233`
5. Paste endpoint into `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` in your `.env`
6. Paste API key into `TEMPORAL_API_KEY`

### 5. Run CONDUCTOR

```bash
pnpm dev
```

You should see:
```
[CONDUCTOR] Starting worker...
[CONDUCTOR] Connecting to: your-namespace.tmprl.cloud:7233
[CONDUCTOR] Dev mode — loaded workflow: full-agent-flow
[CONDUCTOR] Worker state changed — RUNNING
[CONDUCTOR] Triggering workflow...
[CONDUCTOR] Workflow complete. Results: [...]
```

---

## Running Different Workflows

To run a different example YAML, open `src/index.ts` and change this line:

```typescript
const yamlPath = path.resolve(__dirname, "../examples/full-agent-flow.yml")
```

To point to any file in the `examples/` folder:

```typescript
const yamlPath = path.resolve(__dirname, "../examples/echo-workflow.yml")
```

Available examples:

| File | What it tests |
|---|---|
| `echo-workflow.yml` | Basic Temporal connection and YAML parsing |
| `safe-propose.yml` | Safe multisig transaction proposal on Sepolia |
| `webhook-conditional.yml` | HTTP webhook with conditional logic |
| `full-agent-flow.yml` | All connectors — x402, ERC-8004, webhook, echo |

---

## Available Connectors

### echo
Logs a message and returns it. Used for testing and as workflow markers.

```yaml
- id: my-step
  type: echo
  params:
    message: "Hello from CONDUCTOR."
```

---

### webhook
Sends an HTTP POST to any URL with a JSON payload.

```yaml
- id: notify
  type: webhook
  params:
    url: "https://your-endpoint.com/webhook"
    payload:
      event: "something.happened"
      data: "any value"
```

Result fields: `success` (boolean), `status` (HTTP status code), `url`

---

### safe.propose
Proposes a multisig transaction to a Safe wallet on Sepolia. Requires `SAFE_ADDRESS`, `SEPOLIA_RPC_URL`, and `SIGNER_PRIVATE_KEY` in your `.env`.

```yaml
- id: approve-payment
  type: safe.propose
  params:
    to: "0xRecipientAddress"
    value_eth: "0.001"
```

Result fields: `success`, `safeTxHash`, `safeAddress`, `to`, `value_eth`

**Important:** Your Safe must be version v1.4.1+L2 compatible. The signer wallet must be an owner of the Safe.

---

### x402.verify
Verifies an x402 payment header. Uses `@x402/core` v2.10.0 infrastructure — `x402ResourceServer`, `ExactEvmScheme`, `HTTPFacilitatorClient` all initialized against `https://x402.org/facilitator`.

```yaml
- id: verify-payment
  type: x402.verify
  params:
    payment_header: "x402-USDC-10.00-0xPayerAddress"
    amount_usd: 10.00
    token: "USDC"
    network: "eip155:11155111"
```

**Development:** Use the mock header format `x402-TOKEN-AMOUNT-PAYER` for testing without a live x402 client.

**Production:** Send a real Base64-encoded `PaymentPayload` from any x402-compatible client. The infrastructure verifies it end-to-end against the facilitator.

Result fields: `verified` (boolean), `amount_usd`, `token`, `payer`, `transaction`

---

### erc8004.check
Checks if an Ethereum address is registered in the ERC-8004 Identity Registry on Sepolia. Makes real on-chain calls to `0x8004A818BFB912233c491871b3d84c89A494BD9e`.

```yaml
- id: check-identity
  type: erc8004.check
  params:
    agent_address: "0xAgentAddress"
    min_reputation: 0
```

**To register an address:** Go to https://sepolia.etherscan.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e#writeContract → Write as Proxy → Connect MetaMask → Call `register()` (no parameters). One-time, permanent.

Result fields: `verified` (boolean), `registered`, `agent_count`, `reputation`, `agent_address`

---

## Conditional Logic

Use `if:` on any step to make it conditional on a previous step's result:

```yaml
- id: step-2
  type: webhook
  if: "step-1.success"    # only runs if step-1 returned success: true
```

```yaml
- id: step-3
  type: echo
  if: "step-2.verified"   # only runs if step-2 returned verified: true
```

The condition uses dot notation: `step-id.field`. It evaluates the field from the result object of the referenced step. Any truthy value passes. Any falsy value skips the step.

Available condition fields by connector:

| Connector | Condition fields |
|---|---|
| echo | `success` |
| webhook | `success` |
| safe.propose | `success` |
| x402.verify | `verified` |
| erc8004.check | `verified`, `registered` |

---

## Running in Production (Docker)

CONDUCTOR ships with a Dockerfile and docker-compose.yml. Any developer with Docker can run it with one command.

```bash
# Copy and fill your environment variables
cp .env.example .env
# Edit .env with your values

# Run CONDUCTOR
docker-compose up
```

In production mode (without `CONDUCTOR_DEV_MODE=true`), the worker starts and waits for workflows to be triggered externally via the Temporal SDK or Temporal Cloud UI. It does not auto-trigger a test workflow.

---

## Triggering Workflows Programmatically

To trigger a workflow from your own code:

```typescript
import { Client, Connection } from "@temporalio/client"
import { conductorWorkflow } from "./workflows/echo-workflow"
import { WorkflowConfigSchema } from "./schema/workflow-config"
import * as yaml from "js-yaml"
import * as fs from "fs"

const connection = await Connection.connect({
  address: process.env.TEMPORAL_ADDRESS,
  apiKey: process.env.TEMPORAL_API_KEY,
  tls: true,
})

const client = new Client({
  connection,
  namespace: process.env.TEMPORAL_NAMESPACE,
})

const raw = fs.readFileSync("your-workflow.yml", "utf8")
const config = WorkflowConfigSchema.parse(yaml.load(raw))

const handle = await client.workflow.start(conductorWorkflow, {
  args: [config],
  taskQueue: "conductor-task-queue",
  workflowId: `conductor-${Date.now()}`,
})

const results = await handle.result()
console.log("Results:", results)
```

---

## Adding a New Connector

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete four-step guide to adding a connector.

The short version:
1. Create `src/activities/your-connector.ts`
2. Register it in `src/worker/index.ts`
3. Add routing in `src/workflows/echo-workflow.ts`
4. Add an example YAML in `examples/`
5. Run `pnpm dev` and confirm it works

---

Deploy to Google Cloud Run
CONDUCTOR can be deployed to Google Cloud Run for production use. The worker connects to Temporal Cloud and processes workflows durably in the cloud.
Prerequisites

Google Cloud account with billing enabled
gcloud CLI installed and authenticated
Docker installed
Your .env values ready

Step 1 — Set up Google Cloud project
bash# Create a new project or use existing
gcloud projects create conductor-prod --name="CONDUCTOR"
gcloud config set project conductor-prod

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
Step 2 — Configure environment variables in Cloud Run
bashgcloud run deploy conductor \
  --image gcr.io/YOUR_PROJECT_ID/conductor:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233" \
  --set-env-vars "TEMPORAL_NAMESPACE=your-namespace.tmprl.cloud" \
  --set-env-vars "TEMPORAL_API_KEY=your-temporal-api-key" \
  --set-env-vars "TEMPORAL_TASK_QUEUE=conductor-task-queue" \
  --set-env-vars "SAFE_ADDRESS=0xYourSafeAddress" \
  --set-env-vars "SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key" \
  --set-env-vars "SIGNER_PRIVATE_KEY=your-private-key" \
  --set-env-vars "GEMINI_API_KEY=your-gemini-api-key"
Step 3 — Build and deploy using Cloud Build
bash# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml .
Step 4 — Verify deployment
bash# Check service status
gcloud run services describe conductor --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=conductor" --limit 50
Step 5 — Trigger a workflow
Once deployed, trigger workflows using the Temporal Cloud UI or SDK. The Cloud Run instance runs the worker — it connects to Temporal Cloud and processes any workflow you start.
Environment Variables Reference
VariableDescriptionTEMPORAL_ADDRESSYour Temporal Cloud namespace endpointTEMPORAL_NAMESPACEYour Temporal Cloud namespaceTEMPORAL_API_KEYTemporal Cloud API keyTEMPORAL_TASK_QUEUETask queue name (default: conductor-task-queue)SAFE_ADDRESSSafe multisig wallet address on SepoliaSEPOLIA_RPC_URLAlchemy Sepolia RPC URLSIGNER_PRIVATE_KEYWallet private key for Safe transactionsGEMINI_API_KEYGoogle Gemini API key


## Architecture Overview

```
YAML file
    │
    ▼
WorkflowConfigSchema (Zod) — validates the YAML
    │
    ▼
conductorWorkflow (Temporal) — orchestrates steps in order
    │
    ├── evaluateCondition() — checks if: fields
    │
    └── proxyActivities — routes each step type to its activity
            │
            ├── echo activity
            ├── webhookSend activity
            ├── safePropose activity
            ├── x402Verify activity
            └── erc8004Check activity
                    │
                    ▼
            External systems (Temporal Cloud, Sepolia, Safe, x402, ERC-8004)
```

Temporal guarantees that each activity runs exactly once, retries on failure, and preserves state even if the worker restarts. This is why CONDUCTOR can safely orchestrate financial transactions — the workflow engine never loses its place.

---

## CI/CD

Every push to `main` triggers the GitHub Actions workflow in `.github/workflows/test.yml`:

1. Checkout code
2. Install Node.js 22
3. Install pnpm 10.33.2
4. `pnpm install --frozen-lockfile`
5. `pnpm build` — TypeScript compile check
6. `docker build` — Docker image build check

A green checkmark on every commit means the code compiles and the Docker image builds clean. Secrets are stored in GitHub repository settings and injected at CI time.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `dns error — No such host is known` | Wrong TEMPORAL_ADDRESS or .env not loaded | Check .env values. Confirm namespace endpoint. |
| `apiKey is mandatory` | SafeApiKit constructor missing txServiceUrl | Add `txServiceUrl: "https://safe-transaction-sepolia.safe.global"` |
| `Error: Not Found` on Safe propose | L2 Safe version mismatch | Use direct fetch to `/api/v1/safes/{addr}/multisig-transactions/` |
| `balanceOf = 0` on ERC-8004 | Address not registered | Call `register()` on Identity Registry via Etherscan |
| `ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF` | .npmrc changed after install | `pnpm install` to recreate node_modules |
| TypeScript compile errors | moduleResolution wrong | Set `"moduleResolution": "bundler"` in tsconfig |
| `CONDUCTOR_DEV_MODE not recognized` | Windows env var issue | Use `cross-env` in dev script |

---

## Key Addresses (Ethereum Sepolia)

| Contract | Address |
|---|---|
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| USDC (Sepolia) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

---

## Resources

- Temporal Cloud: https://cloud.temporal.io
- Temporal TypeScript SDK docs: https://docs.temporal.io/develop/typescript
- x402 spec: https://x402.org
- x402 Coinbase docs: https://docs.cdp.coinbase.com/x402
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- Safe Global: https://safe.global
- Alchemy (RPC): https://alchemy.com
- Sepolia faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

---

*CONDUCTOR — Built for the age of AI agents.*