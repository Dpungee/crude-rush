/**
 * Treasury wallet management.
 *
 * The treasury keypair lives ONLY on the server. It signs SPL transfer
 * transactions that send $CRUDE tokens from the treasury to players.
 * The player then counter-signs and submits the transaction.
 *
 * NEVER expose TREASURY_KEYPAIR_SECRET to the client.
 */
import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js'
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  getMint,
} from '@solana/spl-token'
import bs58 from 'bs58'
import { getConnection, CRUDE_TOKEN_MINT } from './solana'

/** Load the treasury keypair from environment */
export function getTreasuryKeypair(): Keypair {
  const secret = process.env.TREASURY_KEYPAIR_SECRET
  if (!secret) throw new Error('TREASURY_KEYPAIR_SECRET not set')
  return Keypair.fromSecretKey(bs58.decode(secret))
}

/**
 * Build a partially-signed SPL token transfer transaction.
 *
 * Server signs with the treasury key.
 * Client (player) signs and submits to complete the transfer.
 *
 * @param playerPublicKey - destination wallet
 * @param microAmount - amount in micro-$CRUDE (divide by 1e6 for display)
 * @returns base64-encoded serialized transaction
 */
export async function buildClaimTransaction(
  playerPublicKey: PublicKey,
  microAmount: bigint
): Promise<string> {
  if (!CRUDE_TOKEN_MINT) {
    throw new Error('CRUDE_TOKEN_MINT not configured — deploy the token first')
  }

  const connection = getConnection()
  const treasury = getTreasuryKeypair()

  // Get mint info to determine decimals
  const mint = await getMint(connection, CRUDE_TOKEN_MINT)
  const tokenAmount = microAmount // micro-$CRUDE is already the raw token amount at 6 decimals

  // Get or create the treasury's ATA (source)
  const treasuryATA = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    CRUDE_TOKEN_MINT,
    treasury.publicKey
  )

  // Get or create the player's ATA (destination)
  // We use treasury as fee payer to create the ATA if needed
  const playerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    CRUDE_TOKEN_MINT,
    playerPublicKey
  )

  // Build the transfer instruction
  const transferIx = createTransferInstruction(
    treasuryATA.address,
    playerATA.address,
    treasury.publicKey,
    tokenAmount
  )

  // Build and partially sign the transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: playerPublicKey, // player pays network fees
  }).add(transferIx)

  // Server signs with treasury key
  tx.partialSign(treasury)

  // Serialize — player will counter-sign and submit
  const serialized = tx.serialize({ requireAllSignatures: false })
  return Buffer.from(serialized).toString('base64')
}
