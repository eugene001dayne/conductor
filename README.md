# CONDUCTOR

> Universal remote control for AI agents. Orchestrate Web3 actions — payments, identity, multi-sig — with simple YAML files. No custom code required.

**Live on:** Temporal Cloud  
**Testnet:** Ethereum Sepolia  
**License:** MIT  
**Built by:** Eugene Dayne Mawuli ([@eugene001dayne](https://github.com/eugene001dayne))

---

## What is CONDUCTOR?

CONDUCTOR is an open-source workflow engine that lets AI agents coordinate actions across Web3 systems in a guaranteed, reliable sequence.

You write a YAML file. CONDUCTOR handles the rest — retries, ordering, failures, and state — powered by Temporal Cloud.

**The problem it solves:** AI agents need to touch multiple systems in sequence. Verify a payment. Check an identity. Get multi-sig approval. Notify a webhook. If any step fails, the whole flow needs to retry correctly without double-executing. Normal code can't guarantee this. CONDUCTOR can.

---

## Connectors (v1)

| Connector | Type | Status |
|---|---|---|
| `echo` | Debug | ✅ Live |
| `webhook` | HTTP POST to any URL | ✅ Live |
| `safe.propose` | Safe multisig transaction proposal | ✅ Live on Sepolia |
| `x402.verify` | x402 payment header verification | ✅ Live (mock — production TODO noted) |
| `erc8004.check` | ERC-8004 agent identity check | ✅ Live (mock — production TODO noted) |

---

## The Full Agent Flow

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

  - id: notify-webhook
    type: webhook
    if: "check-identity.verified"
    params:
      url: "https://your-webhook-url.com"
      payload:
        event: "conductor.agent.verified"
        message: "Payment verified and identity confirmed."

  - id: complete
    type: echo
    if: "notify-webhook.success"
    params:
      message: "Full agent flow complete."
```

Each step only runs if the previous step succeeded. No code required — just YAML.

---

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Temporal Cloud](https://cloud.temporal.io) account (free tier works)
- An Alchemy RPC URL for Sepolia (free at [alchemy.com](https://alchemy.com))
- A MetaMask wallet with Sepolia ETH (free from [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
- A [Safe multisig wallet](https://app.safe.global) on Sepolia (free)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/eugene001dayne/conductor.git
cd conductor

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
```

Edit `.env` with your values:

```env
TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace.tmprl.cloud
TEMPORAL_API_KEY=your-temporal-api-key

TEMPORAL_TASK_QUEUE=conductor-task-queue

SAFE_ADDRESS=0xYourSafeAddress
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
SIGNER_PRIVATE_KEY=your-wallet-private-key
```

```bash
# 4. Run CONDUCTOR
pnpm dev
```

---

## How to Create a Custom Workflow

1. Create a YAML file in the `examples/` folder
2. Define your steps using any available connector type
3. Use `if:` to make steps conditional on previous results
4. Update the `yamlPath` in `src/index.ts` to point to your file
5. Run `pnpm dev`

### Conditional logic

Steps check the result of previous steps using dot notation:

```yaml
if: "step-id.verified"    # runs if step-id returned verified: true
if: "step-id.success"     # runs if step-id returned success: true
```

---

## Project Structure

```
conductor/
├── src/
│   ├── activities/
│   │   ├── echo.ts              # Debug activity
│   │   ├── webhook.ts           # HTTP webhook connector
│   │   ├── safe-multisig.ts     # Safe wallet connector
│   │   ├── x402-verify.ts       # x402 payment connector
│   │   └── erc8004-check.ts     # ERC-8004 identity connector
│   ├── workflows/
│   │   └── echo-workflow.ts     # Main workflow orchestrator
│   ├── schema/
│   │   └── workflow-config.ts   # Zod schema for YAML validation
│   ├── worker/
│   │   └── index.ts             # Temporal worker
│   └── index.ts                 # Entry point
├── examples/
│   ├── echo-workflow.yml
│   ├── safe-propose.yml
│   ├── webhook-conditional.yml
│   └── full-agent-flow.yml      # The complete demo
└── .env.example
```

---

## Roadmap

- [ ] Gitcoin Passport integration as identity issuer
- [ ] Real x402 SDK integration (production hardening)
- [ ] Real ERC-8004 registry calls (on-chain)
- [ ] Multiple workflow support (run N workflows concurrently)
- [ ] SDK for developers to add custom connectors
- [ ] Docker one-command setup
- [ ] Mainnet deployment

---

## Contributing

CONDUCTOR is open source. If you want to add a connector:

1. Create a new file in `src/activities/`
2. Export your activity function with typed params and result
3. Register it in `src/worker/index.ts`
4. Add the step type handler in `src/workflows/echo-workflow.ts`
5. Add an example YAML in `examples/`
6. Open a pull request

---

## Built With

- [Temporal Cloud](https://cloud.temporal.io) — durable workflow execution
- [Semaphore V4](https://semaphore.pse.dev) — ZK identity (via zk-poh)
- [Safe Global](https://safe.global) — multisig wallets
- [x402](https://x402.org) — HTTP payment protocol
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — AI agent identity standard
- [Alchemy](https://alchemy.com) — Ethereum RPC
- [Zod](https://zod.dev) — schema validation

---

## License

MIT — use it, fork it, build on it.