'use client'

import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber, formatCommas, truncateWallet } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { DEFAULT_REWARD_TIERS, getRewardTierForRank } from '@/engine/season'

const MICRO = 1_000_000

interface SeasonEntry {
  rank: number
  walletAddress: string
  displayName: string | null
  score: number
  seasonBarrels: number
  seasonPrestiges: number
  prestigeLevel: number
}

interface SeasonInfo {
  id: number
  seasonNumber: number
  startsAt: string
  endsAt: string
  timeRemainingMs: number
  status: string
}

interface MyEntry {
  score: number
  rank: number
  seasonBarrels: number
  seasonPetrodollars: number
  seasonTilesUnlocked: number
  seasonUpgradesBought: number
  seasonPrestiges: number
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended'
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function LeaderboardPanel() {
  const [entries, setEntries] = useState<SeasonEntry[]>([])
  const [season, setSeason] = useState<SeasonInfo | null>(null)
  const [myEntry, setMyEntry] = useState<MyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  const walletAddress = usePlayerStore((s) => s.walletAddress)
  const authToken = usePlayerStore((s) => s.authToken)

  // Fetch season info + leaderboard
  useEffect(() => {
    async function fetchAll() {
      try {
        const [seasonRes, lbRes] = await Promise.all([
          fetch('/api/season', {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }),
          fetch('/api/season/leaderboard'),
        ])

        if (seasonRes.ok) {
          const data = await seasonRes.json()
          setSeason(data.season)
          setMyEntry(data.myEntry)
        }
        if (lbRes.ok) {
          const data = await lbRes.json()
          setEntries(data.leaderboard || [])
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, 60_000)
    return () => clearInterval(interval)
  }, [authToken])

  // Countdown timer
  useEffect(() => {
    if (!season?.endsAt) return
    const tick = () => {
      const ms = Math.max(0, new Date(season.endsAt).getTime() - Date.now())
      setTimeLeft(formatTimeRemaining(ms))
    }
    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [season?.endsAt])

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading season…</div>
  }

  const myTier = myEntry?.rank ? getRewardTierForRank(myEntry.rank) : null

  return (
    <div className="space-y-3">
      {/* Season header */}
      <div className="bg-gradient-to-r from-crude-950/40 to-oil-800/40 rounded-lg p-3 border border-crude-700/30">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-black text-foreground">
            Season {season?.seasonNumber ?? 1}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">⏱️</span>
            <span className="text-xs font-bold text-crude-400 tabular-nums">{timeLeft || '—'}</span>
          </div>
        </div>

        {/* My rank card */}
        {myEntry ? (
          <div className="bg-oil-900/60 rounded-md p-2 mt-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground">Your Rank</div>
              <div className="text-lg font-black text-crude-400">#{myEntry.rank}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">Score</div>
              <div className="text-sm font-bold text-foreground tabular-nums">{formatCommas(myEntry.score)}</div>
            </div>
            {myTier && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Reward</div>
                <div className="text-xs font-bold text-crude-400">{formatNumber(myTier.tokenReward / MICRO, 0)} $CRUDE</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground/60 mt-1">
            Start playing to enter the season rankings
          </div>
        )}
      </div>

      {/* Leaderboard list */}
      {entries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No competitors yet. Claim #1!
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const isMe = entry.walletAddress === walletAddress
            const rankIcon = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null
            const tier = getRewardTierForRank(entry.rank)

            return (
              <div
                key={entry.walletAddress}
                className={cn(
                  'flex items-center gap-2.5 p-2 rounded-lg border transition-all',
                  isMe
                    ? 'bg-crude-500/10 border-crude-500/30'
                    : entry.rank <= 3
                      ? 'bg-oil-800/40 border-oil-700/40'
                      : 'bg-oil-800/20 border-oil-700/20'
                )}
              >
                <span className="text-sm w-7 text-center font-black tabular-nums shrink-0">
                  {rankIcon ?? `#${entry.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {entry.displayName || truncateWallet(entry.walletAddress)}
                    {isMe && <span className="text-crude-400 ml-1 text-[10px]">(you)</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCommas(entry.score)} pts
                    {entry.seasonPrestiges > 0 && (
                      <span className="text-violet-400 ml-1.5">P{entry.seasonPrestiges}</span>
                    )}
                  </div>
                </div>
                {tier && (
                  <span className="text-[9px] font-bold text-crude-400/60 shrink-0">
                    {formatNumber(tier.tokenReward / MICRO, 0)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reward tiers preview */}
      <div className="bg-oil-800/20 rounded-lg p-3 border border-oil-700/20">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Season Rewards</h4>
        <div className="space-y-1 text-[10px]">
          {DEFAULT_REWARD_TIERS.slice(0, 5).map((tier) => (
            <div key={tier.tierName} className={cn(
              'flex justify-between',
              myEntry?.rank && myEntry.rank >= tier.rankMin && myEntry.rank <= tier.rankMax
                ? 'text-crude-400 font-bold'
                : 'text-muted-foreground'
            )}>
              <span>
                {tier.rankMin === tier.rankMax ? `#${tier.rankMin}` : `#${tier.rankMin}-${tier.rankMax}`}
                {tier.title && ` · ${tier.title}`}
              </span>
              <span className="tabular-nums">{formatNumber(tier.tokenReward / MICRO, 0)} $CRUDE</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
