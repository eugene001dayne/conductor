import { log } from "@temporalio/activity"
import * as dotenv from "dotenv"

dotenv.config()

export interface X402VerifyParams {
  payment_header: string
  amount_usd: number
  token: string
}

export interface X402VerifyResult {
  verified: boolean
  amount_usd: number
  token: string
  payer?: string
  error?: string
}

// x402 payment verification connector
// Spec: https://x402.org
// SDK: npm i x402 (v0.5.3)
// This implementation verifies a payment header against the x402 standard.
// TODO: Replace mock with real x402 verification when connecting to a live paywall:
//   import { verify } from "x402"
//   const result = await verify(params.payment_header, { amount: params.amount_usd, token: params.token })

export async function x402Verify(params: X402VerifyParams): Promise<X402VerifyResult> {
  log.info("x402 verify initiating", {
    amount_usd: params.amount_usd,
    token: params.token,
  })

  // Validate payment header format
  if (!params.payment_header || !params.payment_header.startsWith("x402-")) {
    log.info("x402 verify failed — invalid header format")
    return {
      verified: false,
      amount_usd: params.amount_usd,
      token: params.token,
      error: "Invalid x402 payment header format",
    }
  }

  // Parse the mock header — format: x402-{token}-{amount}-{payer}
  const parts = params.payment_header.split("-")
  if (parts.length < 4) {
    return {
      verified: false,
      amount_usd: params.amount_usd,
      token: params.token,
      error: "Malformed payment header",
    }
  }

  const headerToken = parts[1]
  const headerAmount = parseFloat(parts[2])
  const payer = parts[3]

  // Verify token matches
  if (headerToken !== params.token) {
    return {
      verified: false,
      amount_usd: params.amount_usd,
      token: params.token,
      error: `Token mismatch: expected ${params.token}, got ${headerToken}`,
    }
  }

  // Verify amount meets minimum
  if (headerAmount < params.amount_usd) {
    return {
      verified: false,
      amount_usd: params.amount_usd,
      token: params.token,
      error: `Insufficient payment: expected ${params.amount_usd}, got ${headerAmount}`,
    }
  }

  log.info("x402 verify success", { payer, amount: headerAmount, token: headerToken })
  console.log(`[CONDUCTOR] x402 payment verified — ${headerAmount} ${headerToken} from ${payer}`)

  return {
    verified: true,
    amount_usd: headerAmount,
    token: headerToken,
    payer,
  }
}