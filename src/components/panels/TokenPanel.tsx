'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber, formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'

const MICRO = 1_000_000
const MIN_CLAIM = 10 * MICRO  // 10 $CRUDE

export function TokenPanel() {
  const { sendTransaction } = useWallet()
  const { connection } = useConnection()

  const pendingTokens = usePlayerStore((s) => s.pendingCrudeTokens)
  const authToken = usePlayerStore((s) => s.authToken)
  const setPendingTokens = usePlayerStore((s) => s.setPendingTokens)
  const addToast = useUiStore((s) => s.addToast)

  const [claiming, setClaiming] = useState(false)

  const displayBalance = pendingTokens / MICRO
  const canClaim = pendingTokens >= MIN_CLAIM

  const handleClaim = async () => {
    if (!authToken || !canClaim || claiming) return
    setClaiming(true)

    try {
      // 1. Request partially-signed transaction from server
      const claimRes = await fetch('/api/token/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const claimData = await claimRes.json()

      if (!claimRes.ok) {
        addToast({ message: claimData.error || 'Claim failed', type: 'error' })
        setClaiming(false)
        return
      }

      // 2. Deserialize transaction
      const txBytes = Buffer.from(claimData.transaction, 'base64')
      const tx = Transaction.from(txBytes)

      // 3. Player signs + submits via Phantom
      const txSignature = await sendTransaction(tx, connection)

      addToast({ message: 'Transaction submitted! Confirming…', type: 'info' })

      // 4. Wait for confirmation
      await connection.confirmTransaction(txSignature, 'confirmed')

      // 5. Notify server to mark ledger entries as settled
      await fetch('/api/token/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          claimId: claimData.claimId,
          txSignature,
          ledgerIds: claimData.ledgerIds,
        }),
      })

      // 6. Zero out pending balance locally
      setPendingTokens(0)

      const amount = Number(BigInt(claimData.amount)) / MICRO
      addToast({
        message: `${formatNumber(amount)} $CRUDE claimed! 🎉`,
        type: 'reward',
        duration: 6000,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('rejected')) {
        addToast({ message: 'Transaction rejected in wallet', type: 'error' })
      } else {
        addToast({ message: 'Claim failed — try again', type: 'error' })
        console.error('Claim error:', err)
      }
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">$CRUDE Token</h3>

      {/* Balance card */}
      <div className="bg-oil-800/50 rounded-lg p-4 border border-crude-500/20 text-center">
        <div className="text-4xl mb-2">🪙</div>
        <div className="text-2xl font-black text-crude-400">
          {formatNumber(displayBalance, 2)}
        </div>
        <div className="text-sm text-muted-foreground font-semibold">$CRUDE earned</div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatCommas(pendingTokens)} micro-$CRUDE
        </div>
      </div>

      {/* Claim section */}
      {!CRUDE_TOKEN_AVAILABLE ? (
        <div className="bg-oil-800/30 rounded-lg p-4 border border-oil-700/30 text-center">
          <p className="text-xs text-muted-foreground">
            $CRUDE token launches at TGE. Your balance is accumulating now and will be
            claimable on launch day.
          </p>
          <div className="mt-3 text-xs font-semibold text-crude-400/70">
            Keep earning — every barrel counts.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {!canClaim && (
            <p className="text-xs text-muted-foreground text-center">
              Earn {formatNumber((MIN_CLAIM - pendingTokens) / MICRO, 1)} more $CRUDE to unlock claims.
            </p>
          )}

          <div className="w-full h-1.5 bg-oil-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-crude-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((pendingTokens / MIN_CLAIM) * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className={cn(
              'w-full py-3 rounded-lg text-sm font-bold transition-all',
              canClaim && !claiming
                ? 'bg-gradient-to-r from-crude-600 to-crude-500 text-oil-950 hover:from-crude-500 hover:to-crude-400 active:scale-[0.98] shadow-lg shadow-crude-500/20'
                : 'bg-oil-700 text-muted-foreground cursor-not-allowed'
            )}
          >
            {claiming
              ? 'Sending to wallet…'
              : canClaim
              ? `Claim ${formatNumber(displayBalance, 2)} $CRUDE`
              : `Need ${formatNumber(MIN_CLAIM / MICRO)} $CRUDE minimum`}
          </button>

          <p className="text-xs text-muted-foreground/50 text-center">
            Max 1 claim per 24 hours. Network fees paid by your wallet.
          </p>
        </div>
      )}

      {/* Earning breakdown */}
      <div className="bg-oil-800/30 rounded-lg p-3 border border-oil-700/30">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">How to earn $CRUDE</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>100 barrels milestone</span>
            <span className="text-crude-400">0.5 $CRUDE</span>
          </div>
          <div className="flex justify-between">
            <span>1,000 barrels milestone</span>
            <span className="text-crude-400">2 $CRUDE</span>
          </div>
          <div className="flex justify-between">
            <span>10,000 barrels milestone</span>
            <span className="text-crude-400">10 $CRUDE</span>
          </div>
          <div className="flex justify-between">
            <span>100,000 barrels milestone</span>
            <span className="text-crude-400">50 $CRUDE</span>
          </div>
          <div className="flex justify-between">
            <span>Staking bonus (Phase 3)</span>
            <span className="text-crude-400/50">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Set to true once the $CRUDE token is deployed on mainnet.
 * Until then, the panel shows the pre-TGE accumulation message.
 */
const CRUDE_TOKEN_AVAILABLE = process.env.NEXT_PUBLIC_CRUDE_TOKEN_MINT !== undefined
