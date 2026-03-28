'use client'

import { useUiStore } from '@/stores/uiStore'
import { useGameStore } from '@/stores/gameStore'
import { UpgradePanel } from './UpgradePanel'
import { MissionPanel } from './MissionPanel'
import { LeaderboardPanel } from './LeaderboardPanel'
import { PrestigePanel } from './PrestigePanel'
import { SellPanel } from './SellPanel'
import { ExpandPanel } from './ExpandPanel'
import { cn } from '@/lib/utils'
import type { PanelTab } from '@/types'

const TABS: { id: PanelTab; label: string; emoji: string }[] = [
  { id: 'upgrades', label: 'Upgrades', emoji: '⚡' },
  { id: 'missions', label: 'Missions', emoji: '🎯' },
  { id: 'leaderboard', label: 'Ranks', emoji: '🏆' },
  { id: 'prestige', label: 'Prestige', emoji: '🌟' },
]

export function SidePanel() {
  const activeTab = useUiStore((s) => s.activeTab)
  const setActiveTab = useUiStore((s) => s.setActiveTab)

  return (
    <div className="h-full flex flex-col bg-oil-900/50">
      {/* Tab bar */}
      <div className="flex border-b border-oil-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold transition-colors text-center',
              activeTab === tab.id
                ? 'text-crude-400 border-b-2 border-crude-500 bg-oil-800/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-oil-800/20'
            )}
          >
            <span className="block text-sm mb-0.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Always show sell + expand at top */}
        <SellPanel />
        <ExpandPanel />

        {/* Tab-specific content */}
        {activeTab === 'upgrades' && <UpgradePanel />}
        {activeTab === 'missions' && <MissionPanel />}
        {activeTab === 'leaderboard' && <LeaderboardPanel />}
        {activeTab === 'prestige' && <PrestigePanel />}
      </div>
    </div>
  )
}
