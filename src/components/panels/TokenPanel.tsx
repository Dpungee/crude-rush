'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { usePlayerStore } from '@/stores/playerStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber, formatCommas } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BARREL_MILESTONES } from '@/engine/constants'

const MICRO = 1_000_000
const MIN_CLAIM = 10 * MICRO  // 10 $CRUDE

/** Whether the token is deployed and claims are open */
const CRUDE_TOKEN_AVAILABLE = Boolean(process.env.NEXT_PUBLIC_CRUDE_TOKEN_MINT)

export function TokenPanel() {
  const { sendTransaction } = useWallet()
  const { connection } = useConnection()

  const pendingTokens = usePlayerStore((s) => s.pendingCrudeTokens)
  const totalEarned = usePlayerStore((s) => s.totalEarnedTokens)
  const authToken = usePlayerStore((s) => s.authToken)
  const cooldownExpiresAt = usePlayerStore((s) => s.claimCooldownExpiresAt)
  const setPendingTokens = usePlayerStore((s) => s.setPendingTokens)
  const setTotalEarnedTokens = usePlayerStore((s) => s.setTotalEarnedTokens)
  const setClaimCooldown = usePlayerStore((s) => s.setClaimCooldown)
  const addToast = useUiStore((s) => s.addToast)

  const [claiming, setClaiming] = useState(false)
  const [cooldownDisplay, setCooldownDisplay] = useState('')

  const displayBalance = pendingTokens / MICRO
  const canClaim = pendingTokens >= MIN_CLAIM && !cooldownExpiresAt

  // ── Refresh balance from server ──────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await fetch('/api/token/balance', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        // balance/totalEarned come back as strings (BigInt-safe)
        setPendingTokens(Number(data.balance ?? 0))
        setTotalEarnedTokens(Number(data.totalEarned ?? 0))
        setClaimCooldown(data.cooldownExpiresAt ?? null)
      }
    } catch {
      // non-critical
    }
  }, [authToken, setPendingTokens, setTotalEarnedTokens, setClaimCooldown])

  // Refresh on mount
  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  // ── Cooldown countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!cooldownExpiresAt) {
      setCooldownDisplay('')
      return
    }

    const tick = () => {
      const remaining = new Date(cooldownExpiresAt).getTime() - Date.now()
      if (remaining <= 0) {
        setCooldownDisplay('')
        setClaimCooldown(null)
        return
      }
      const h = Math.floor(remaining / 3_600_000)
      const m = Math.floor((remaining % 3_600_000) / 60_000)
      const s = Math.floor((remaining % 60_000) / 1_000)
      setCooldownDisplay(`${h}h ${m}m ${s}s`)
    }

    tick()
    const interval = setInterval(tick, 1_000)
    return () => clearInterval(interval)
  }, [cooldownExpiresAt, setClaimCooldown])

  // ── Claim handler ────────────────────────────────────────────────────────
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
        if (claimRes.status === 429 && claimData.cooldownExpiresAt) {
          setClaimCooldown(claimData.cooldownExpiresAt)
        }
        addToast({ message: claimData.error || 'Claim failed', type: 'error' })
        setClaiming(false)
        return
      }

      // 2. Deserialize and sign
      const txBytes = Buffer.from(claimData.transaction, 'base64')
      const tx = Transaction.from(txBytes)

      // 3. Player signs + submits via Phantom
      const txSignature = await sendTransaction(tx, connection)

      addToast({ message: 'Transaction submitted! Confirming…', type: 'info' })

      // 4. Wait for confirmation
      await connection.confirmTransaction(txSignature, 'confirmed')

      // 5. Notify server to mark ledger entries settled
      const confirmRes = await fetch('/api/token/confirm', {
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

      if (!confirmRes.ok) {
        // Tx landed but settlement failed — will auto-settle on next balance refresh
        addToast({
          message: 'Tokens sent but settlement pending — refresh to update balance',
          type: 'info',
        })
      } else {
        const amount = Number(BigInt(claimData.amount)) / MICRO
        addToast({
          message: `${formatNumber(amount)} $CRUDE claimed! 🎉`,
          type: 'reward',
          duration: 6000,
        })
      }

      // 6. Zero out pending balance locally, then refresh from server
      setPendingTokens(0)
      // Set 24h cooldown optimistically
      setClaimCooldown(new Date(Date.now() + 24 * 3_600_000).toISOString())
      // Refresh authoritative balance after a short delay
      setTimeout(refreshBalance, 2_000)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('cancelled')) {
        addToast({ message: 'Transaction rejected in wallet', type: 'error' })
      } else {
        addToast({ message: 'Claim failed — try again', type: 'error' })
        console.error('Claim error:', err)
      }
    } finally {
      setClaiming(false)
    }
  }

  // Show top 4 milestones with token rewards for the earning guide
  const milestoneGuide = BARREL_MILESTONES.filter((m) => m.tokenMicroReward > 0).slice(0, 4)

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
        {totalEarned > 0 && (
          <div className="text-xs text-muted-foreground/60 mt-1">
            {formatNumber(totalEarned / MICRO, 0)} total lifetime
          </div>
        )}
      </div>

      {/* Claim section */}
      {!CRUDE_TOKEN_AVAILABLE ? (
        <div className="bg-oil-800/30 rounded-lg p-4 border border-oil-700/30 text-center space-y-2">
          <p className="text-xs font-semibold text-crude-400/80">⏳ Pre-TGE Accumulation Mode</p>
          <p className="text-xs text-muted-foreground">
            $CRUDE token launches at TGE. Your balance is accumulating now and will be
            claimable on launch day — nothing is lost.
          </p>
          <div className="text-xs font-semibold text-crude-400/70">
            Keep drilling — every barrel counts.
          </div>
        </div>
      ) : cooldownExpiresAt && cooldownDisplay ? (
        /* Cooldown state */
        <div className="bg-oil-800/30 rounded-lg p-4 border border-oil-700/50 text-center space-y-1">
          <div className="text-2xl">⏱️</div>
          <p className="text-sm font-bold text-foreground">Next claim in</p>
          <p className="text-xl font-black text-crude-400 tabular-nums">{cooldownDisplay}</p>
          <p className="text-xs text-muted-foreground">Tokens continue accumulating while you wait</p>
        </div>
      ) : (
        /* Claim available */
        <div className="space-y-2">
          {!canClaim && pendingTokens < MIN_CLAIM && (
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
              ? '🔄 Sending to wallet…'
              : canClaim
              ? `Claim ${formatNumber(displayBalance, 2)} $CRUDE →`
              : `Need ${formatNumber(MIN_CLAIM / MICRO)} $CRUDE minimum`}
          </button>

          <p className="text-xs text-muted-foreground/50 text-center">
            Max 1 claim per 24 hours · Network fees paid by your wallet
          </p>
        </div>
      )}

      {/* Earning guide — sourced from actual constants, not hardcoded */}
      <div className="bg-oil-800/30 rounded-lg p-3 border border-oil-700/30">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Barrel Milestones</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          {milestoneGuide.map((m) => (
            <div key={m.threshold} className="flex justify-between">
              <span>{formatCommas(m.threshold)} barrels</span>
              <span className="text-crude-400 font-semibold">
                {formatNumber(m.tokenMicroReward / MICRO, 0)} $CRUDE
                {m.title ? ` · ${m.title}` : ''}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-oil-700/30 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Mission completions</span>
            <span className="text-crude-400 font-semibold">1–250 $CRUDE</span>
          </div>
          <div className="flex justify-between">
            <span>Daily login (Day 4–7)</span>
            <span className="text-crude-400 font-semibold">1–10 $CRUDE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
