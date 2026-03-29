import { Connection, PublicKey } from '@solana/web3.js'

// ─── Network config ──────────────────────────────────────────────────────────
export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta') || 'devnet'

// Known cluster URLs — avoids clusterApiUrl() which can fail in some web3.js versions
const CLUSTER_URLS: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || // server-side paid RPC (Helius/Triton)
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || // fallback client-side
  CLUSTER_URLS[SOLANA_NETWORK] || CLUSTER_URLS.devnet

/** Server-side Solana connection — use a paid RPC in production */
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, 'confirmed')
}

// ─── $CRUDE token config ─────────────────────────────────────────────────────
/**
 * The $CRUDE SPL token mint address.
 * Set CRUDE_TOKEN_MINT in .env after deploying the token on devnet.
 * Placeholder until deployed.
 */
export const CRUDE_TOKEN_MINT = process.env.CRUDE_TOKEN_MINT
  ? new PublicKey(process.env.CRUDE_TOKEN_MINT)
  : null

/** Staking program ID — set after deploying the Anchor program */
export const STAKING_PROGRAM_ID = process.env.STAKING_PROGRAM_ID
  ? new PublicKey(process.env.STAKING_PROGRAM_ID)
  : null

/** Minimum $CRUDE balance (in micro-$CRUDE) required to submit a claim */
export const MIN_CLAIM_AMOUNT = 10_000_000 // 10 $CRUDE

/** Maximum claims per wallet per 24 hours */
export const MAX_CLAIMS_PER_DAY = 1
