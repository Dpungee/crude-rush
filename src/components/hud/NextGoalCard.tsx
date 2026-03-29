'use client'

import { useGameStore } from '@/stores/gameStore'
import { useMissionStore } from '@/stores/missionStore'
import { useUiStore } from '@/stores/uiStore'
import { BARREL_MILESTONES, TILE_UNLOCK_COSTS } from '@/engine/constants'
import { BUILDING_DEFINITIONS, getBuildingCost } from '@/engine/buildings'
import { getUpgradeCost, UPGRADE_DEFINITIONS, canPurchaseUpgrade } from '@/engine/upgrades'
import { formatCommas, formatNumber, pct } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { UpgradeType } from '@/engine/types'

interface Goal {
  icon: string
  label: string
  sublabel: string
  progress: number      // 0-100
  action?: () => void   // optional click handler
  priority: number      // lower = more urgent
}

export function NextGoalCard() {
  const petrodollars = useGameStore((s) => s.petrodollars)
  const plots = useGameStore((s) => s.plots)
  const upgrades = useGameStore((s) => s.upgrades)
  const lifetimeBarrels = useGameStore((s) => s.lifetimeBarrels)
  const productionRate = useGameStore((s) => s.productionRate)
  const unlockedTileCount = useGameStore((s) => s.unlockedTileCount)
  const missions = useMissionStore((s) => s.missions)
  const setActiveTab = useUiStore((s) => s.setActiveTab)

  const goals: Goal[] = []

  // 1. Build first well (highest priority for new players)
  const hasAnyBuilding = plots.some((p) => p.building !== null)
  if (!hasAnyBuilding) {
    goals.push({
      icon: '\u{1F6E2}\uFE0F',
      label: 'Build your first Oil Well',
      sublabel: 'Tap the glowing tile in the center',
      progress: 0,
      priority: 0,
    })
  }

  // 2. Next affordable upgrade
  const upgradeTypes = Object.keys(UPGRADE_DEFINITIONS) as UpgradeType[]
  const affordableUpgrade = upgradeTypes
    .filter((t) => canPurchaseUpgrade(t, upgrades[t] ?? 0))
    .map((t) => ({ type: t, cost: getUpgradeCost(t, upgrades[t] ?? 0), def: UPGRADE_DEFINITIONS[t] }))
    .sort((a, b) => a.cost - b.cost)
    .find((u) => u.cost <= petrodollars * 3) // show if within 3x affordability

  if (affordableUpgrade) {
    const prog = Math.min(100, (petrodollars / affordableUpgrade.cost) * 100)
    goals.push({
      icon: affordableUpgrade.def.emoji,
      label: `${affordableUpgrade.def.name} Lv.${(upgrades[affordableUpgrade.type] ?? 0) + 1}`,
      sublabel: petrodollars >= affordableUpgrade.cost
        ? 'Ready to buy!'
        : `$${formatCommas(affordableUpgrade.cost - petrodollars)} more needed`,
      progress: prog,
      action: () => setActiveTab('upgrades'),
      priority: petrodollars >= affordableUpgrade.cost ? 1 : 5,
    })
  }

  // 3. Next tile unlock
  const nextTile = plots.find((p) => p.status === 'available')
  if (nextTile) {
    const prog = Math.min(100, (petrodollars / nextTile.unlockCost) * 100)
    goals.push({
      icon: '\u{1F513}',
      label: `Unlock new plot`,
      sublabel: petrodollars >= nextTile.unlockCost
        ? 'Ready to expand!'
        : `$${formatCommas(nextTile.unlockCost)} needed`,
      progress: prog,
      priority: petrodollars >= nextTile.unlockCost ? 2 : 6,
    })
  }

  // 4. Next barrel milestone
  const nextMilestone = BARREL_MILESTONES.find((m) => lifetimeBarrels < m.threshold)
  if (nextMilestone) {
    const prog = pct(lifetimeBarrels, nextMilestone.threshold)
    goals.push({
      icon: '\u{1F3C6}',
      label: nextMilestone.title ? `Earn: ${nextMilestone.title}` : `${formatNumber(nextMilestone.threshold)} barrels`,
      sublabel: `${formatNumber(nextMilestone.threshold - lifetimeBarrels)} bbl to go`,
      progress: prog,
      priority: 8,
    })
  }

  // 5. Claimable mission
  const claimable = missions.find((m) => m.completed && !m.claimed)
  if (claimable) {
    goals.push({
      icon: '\u{1F3AF}',
      label: 'Mission complete!',
      sublabel: 'Claim your reward',
      progress: 100,
      action: () => setActiveTab('missions'),
      priority: 1,
    })
  }

  // Sort by priority and take the top goal
  goals.sort((a, b) => a.priority - b.priority)
  const topGoal = goals[0]

  if (!topGoal) return null

  return (
    <button
      onClick={topGoal.action}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left',
        'bg-oil-800/40 border-oil-700/40 hover:bg-oil-700/40 hover:border-oil-600/50',
        topGoal.progress >= 100 && 'border-crude-500/50 bg-crude-950/20 hover:bg-crude-950/30',
        topGoal.action && 'cursor-pointer',
        !topGoal.action && 'cursor-default',
      )}
    >
      <span className="text-lg shrink-0">{topGoal.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-foreground truncate">{topGoal.label}</div>
        <div className="text-[9px] text-muted-foreground truncate">{topGoal.sublabel}</div>
        {topGoal.progress > 0 && topGoal.progress < 100 && (
          <div className="mt-1 w-full h-1 bg-oil-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-crude-500 rounded-full transition-all duration-500"
              style={{ width: `${topGoal.progress}%` }}
            />
          </div>
        )}
      </div>
      {topGoal.progress >= 100 && (
        <span className="text-[10px] font-black text-crude-400 shrink-0">GO</span>
      )}
    </button>
  )
}
