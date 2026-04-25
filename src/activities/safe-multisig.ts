import * as dotenv from "dotenv"
import { log } from "@temporalio/activity"

dotenv.config()

export interface SafeProposeParams {
  to: string
  value_eth: string
  data?: string
}

export interface SafeProposeResult {
  safeTxHash: string
  safeAddress: string
  to: string
  value_eth: string
}

export async function safePropose(params: SafeProposeParams): Promise<SafeProposeResult> {
  const { ethers } = await import("ethers")
  const Safe = (await import("@safe-global/protocol-kit")).default
  const SafeApiKit = (await import("@safe-global/api-kit")).default

  const privateKey = process.env.SIGNER_PRIVATE_KEY!
  const rpcUrl = process.env.SEPOLIA_RPC_URL!
  const safeAddress = process.env.SAFE_ADDRESS!

  log.info("Safe connector initializing", { safeAddress, to: params.to })

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  const signerAddress = await signer.getAddress()

  log.info("Signer connected", { signerAddress })

  const safeSdk = await Safe.init({
    provider: rpcUrl,
    signer: privateKey,
    safeAddress,
  })

  const apiKit = new SafeApiKit({
    chainId: 11155111n,
    txServiceUrl: "https://safe-transaction-sepolia.safe.global",
  })

  const safeTransactionData = {
    to: params.to,
    value: ethers.parseEther(params.value_eth).toString(),
    data: params.data ?? "0x",
  }

  log.info("Building Safe transaction", safeTransactionData)

  const safeTransaction = await safeSdk.createTransaction({
    transactions: [safeTransactionData],
  })

  const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
  const signature = await safeSdk.signHash(safeTxHash)

  log.info("Transaction signed", { safeTxHash })

  // Use direct API call — L2 Safe requires explicit endpoint
const { default: fetch } = await import("node-fetch")

const proposeBody = {
  to: ethers.getAddress(params.to),
  value: ethers.parseEther(params.value_eth).toString(),
  data: params.data ?? "0x",
  operation: 0,
  safeTxGas: "0",
  baseGas: "0",
  gasPrice: "0",
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  nonce: safeTransaction.data.nonce,
  contractTransactionHash: safeTxHash,
  sender: signerAddress,
  signature: signature.data,
  origin: "conductor",
}

const response = await fetch(
  `https://safe-transaction-sepolia.safe.global/api/v1/safes/${ethers.getAddress(safeAddress)}/multisig-transactions/`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proposeBody),
  }
)

if (!response.ok) {
  const errorText = await response.text()
  throw new Error(`Safe API error ${response.status}: ${errorText}`)
}

  log.info("Transaction proposed successfully", { safeTxHash })
  console.log(`[CONDUCTOR] Safe transaction proposed: ${safeTxHash}`)

  return { safeTxHash, safeAddress, to: params.to, value_eth: params.value_eth }
}