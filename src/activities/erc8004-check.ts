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
  agent_count?: number
  error?: string
}

// ERC-8004 Identity Registry on Sepolia
// Standard: https://eips.ethereum.org/EIPS/eip-8004
// Contract: 0x8004A818BFB912233c491871b3d84c89A494BD9e
// Reputation Registry: 0x8004B663056A597Dffe9eCcC1965A193B7388713

const IDENTITY_REGISTRY_ADDRESS = "0x8004A818BFB912233c491871b3d84c89A494BD9e"
const REPUTATION_REGISTRY_ADDRESS = "0x8004B663056A597Dffe9eCcC1965A193B7388713"

const IDENTITY_REGISTRY_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
]

const REPUTATION_REGISTRY_ABI = [
  "function getReputation(address agent) external view returns (uint256)",
]

export async function erc8004Check(params: ERC8004CheckParams): Promise<ERC8004CheckResult> {
  const rpcUrl = process.env.SEPOLIA_RPC_URL

  log.info("ERC-8004 identity check initiating", {
    agent_address: params.agent_address,
    min_reputation: params.min_reputation ?? 0,
  })

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

    // Query Identity Registry — balanceOf > 0 means registered
    const identityRegistry = new ethers.Contract(
      IDENTITY_REGISTRY_ADDRESS,
      IDENTITY_REGISTRY_ABI,
      provider
    )

    const agentCount = await identityRegistry.balanceOf(params.agent_address)
    const isRegistered = agentCount > 0n

    log.info("ERC-8004 identity registry result", {
      agent_address: params.agent_address,
      agent_count: agentCount.toString(),
      is_registered: isRegistered,
    })

    if (!isRegistered) {
      console.log(`[CONDUCTOR] ERC-8004 — ${params.agent_address} not registered in Identity Registry`)
      return {
        verified: false,
        agent_address: params.agent_address,
        registered: false,
        agent_count: Number(agentCount),
        error: "Agent not registered in ERC-8004 Identity Registry",
      }
    }

    // Query Reputation Registry
    let reputationScore = 0
    try {
      const reputationRegistry = new ethers.Contract(
        REPUTATION_REGISTRY_ADDRESS,
        REPUTATION_REGISTRY_ABI,
        provider
      )
      const rawReputation = await reputationRegistry.getReputation(params.agent_address)
      reputationScore = Number(rawReputation)
    } catch {
      // Reputation registry may not have a score for this address — default to 0
      log.info("ERC-8004 reputation registry — no score found, defaulting to 0")
      reputationScore = 0
    }

    const minRep = params.min_reputation ?? 0
    const meetsReputation = reputationScore >= minRep

    if (!meetsReputation) {
      return {
        verified: false,
        agent_address: params.agent_address,
        registered: true,
        agent_count: Number(agentCount),
        reputation: reputationScore,
        error: `Reputation ${reputationScore} below minimum ${minRep}`,
      }
    }

    log.info("ERC-8004 check success", {
      agent_address: params.agent_address,
      agent_count: agentCount.toString(),
      reputation: reputationScore,
    })

    console.log(`[CONDUCTOR] ERC-8004 identity verified — ${params.agent_address} agents: ${agentCount} reputation: ${reputationScore}`)

    return {
      verified: true,
      agent_address: params.agent_address,
      registered: true,
      agent_count: Number(agentCount),
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