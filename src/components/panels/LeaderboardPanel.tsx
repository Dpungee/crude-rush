'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/engine/types'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber, truncateWallet } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const walletAddress = usePlayerStore((s) => s.walletAddress)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard')
        if (res.ok) {
          const data = await res.json()
          setEntries(data.leaderboard || [])
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Loading leaderboard...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No players yet. Be the first!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground">Leaderboard</h3>

      {entries.map((entry, i) => {
        const isMe = entry.walletAddress === walletAddress
        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

        return (
          <div
            key={entry.walletAddress}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
              isMe
                ? 'bg-crude-500/10 border-crude-500/30'
                : 'bg-oil-800/30 border-oil-700/30'
            )}
          >
            <span className="text-sm w-8 text-center font-bold">
              {rankEmoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {entry.displayName || truncateWallet(entry.walletAddress)}
                {isMe && <span className="text-crude-400 ml-1 text-xs">(you)</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(entry.totalBarrels)} barrels
                {entry.prestigeLevel > 0 && (
                  <span className="text-crude-400 ml-2">P{entry.prestigeLevel}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
