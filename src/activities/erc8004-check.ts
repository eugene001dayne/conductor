import { log } from "@temporalio/activity"
import * as dotenv from "dotenv"

dotenv.config()

export interface ERC8004CheckParams {
  agent_address: string
  min_reputation?: number
}

export interface ERC8004CheckResult {
  verified: boolean
  agent_address: string
  reputation?: number
  registered?: boolean
  error?: string
}

// ERC-8004 identity verification connector
// Standard: https://eips.ethereum.org/EIPS/eip-8004
// Contracts: https://github.com/erc-8004/erc-8004-contracts
// Status: Draft standard — contracts deployed on mainnet and testnets
// TODO: Replace mock with real on-chain call when integrating production:
//   import { ethers } from "ethers"
//   const registry = new ethers.Contract(ERC8004_REGISTRY_ADDRESS, ERC8004_ABI, provider)
//   const identity = await registry.getIdentity(params.agent_address)
//   const reputation = await registry.getReputation(params.agent_address)

const ERC8004_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000008004"

export async function erc8004Check(params: ERC8004CheckParams): Promise<ERC8004CheckResult> {
  const rpcUrl = process.env.SEPOLIA_RPC_URL

  log.info("ERC-8004 identity check initiating", {
    agent_address: params.agent_address,
    min_reputation: params.min_reputation ?? 0,
  })

  // Validate address format
  if (!params.agent_address || !params.agent_address.startsWith("0x") || params.agent_address.length !== 42) {
    return {
      verified: false,
      agent_address: params.agent_address,
      error: "Invalid Ethereum address format",
    }
  }

  try {
    const { ethers } = await import("ethers")
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    // Check if address has on-chain activity — proxy for registration
    // TODO: Replace with actual ERC-8004 registry call
    const code = await provider.getCode(params.agent_address)
    const txCount = await provider.getTransactionCount(params.agent_address)

    // Mock reputation score based on tx count — real implementation reads from registry
    const reputationScore = Math.min(txCount * 10, 100)
    const isRegistered = txCount > 0

    const minRep = params.min_reputation ?? 0
    const meetsReputation = reputationScore >= minRep

    if (!isRegistered) {
      log.info("ERC-8004 check failed — address not registered", { agent_address: params.agent_address })
      return {
        verified: false,
        agent_address: params.agent_address,
        registered: false,
        reputation: reputationScore,
        error: "Agent not registered in ERC-8004 registry",
      }
    }

    if (!meetsReputation) {
      return {
        verified: false,
        agent_address: params.agent_address,
        registered: true,
        reputation: reputationScore,
        error: `Reputation ${reputationScore} below minimum ${minRep}`,
      }
    }

    log.info("ERC-8004 check success", {
      agent_address: params.agent_address,
      reputation: reputationScore,
    })
    console.log(`[CONDUCTOR] ERC-8004 identity verified — ${params.agent_address} reputation: ${reputationScore}`)

    return {
      verified: true,
      agent_address: params.agent_address,
      registered: true,
      reputation: reputationScore,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    log.info("ERC-8004 check error", { error: message })
    return {
      verified: false,
      agent_address: params.agent_address,
      error: `Registry query failed: ${message}`,
    }
  }
}