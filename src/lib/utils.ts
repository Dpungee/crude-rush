import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format large numbers with K, M, B suffixes */
export function formatNumber(n: number, decimals: number = 1): string {
  if (n < 1_000) return n.toFixed(decimals)
  if (n < 1_000_000) return (n / 1_000).toFixed(decimals) + 'K'
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(decimals) + 'M'
  return (n / 1_000_000_000).toFixed(decimals) + 'B'
}

/** Format number with commas */
export function formatCommas(n: number): string {
  return Math.floor(n).toLocaleString('en-US')
}

/** Format seconds into human-readable duration */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

/** Truncate a wallet address for display: "ABC1...XYZ9" */
export function truncateWallet(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/** Calculate percentage, clamped 0-100 */
export function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}

/**
 * Get the player's title based on lifetime barrels.
 * Matches BARREL_MILESTONES titles from constants.ts.
 */
export function getPlayerTitle(lifetimeBarrels: number): string | null {
  // Import-free: hardcode the thresholds to avoid circular deps
  const titles: [number, string][] = [
    [1_000_000_000, 'Crude Rush Legend'],
    [100_000_000, 'Magnate'],
    [10_000_000, 'Tycoon'],
    [1_000_000, 'Oil Baron'],
    [100_000, 'Wildcatter'],
    [10_000, 'Roughneck'],
  ]
  for (const [threshold, title] of titles) {
    if (lifetimeBarrels >= threshold) return title
  }
  return null
}
