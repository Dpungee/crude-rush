'use client'

import { useUiStore } from '@/stores/uiStore'
import { useGameStore } from '@/stores/gameStore'
import { useMissionStore } from '@/stores/missionStore'
import { UpgradePanel } from './UpgradePanel'
import { MissionPanel } from './MissionPanel'
import { LeaderboardPanel } from './LeaderboardPanel'
import { PrestigePanel } from './PrestigePanel'
import { SellPanel } from './SellPanel'
import { TokenPanel } from './TokenPanel'
import { cn } from '@/lib/utils'
import type { PanelTab } from '@/types'

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: 'market',      label: 'Sell',   icon: '💱' },
  { id: 'upgrades',    label: 'Build',  icon: '⚡' },
  { id: 'token',       label: 'Token',  icon: '🪙' },
  { id: 'missions',    label: 'Tasks',  icon: '🎯' },
  { id: 'leaderboard', label: 'Rank',   icon: '🏆' },
  { id: 'prestige',    label: 'Reset',  icon: '🌟' },
]

export function SidePanel() {
  const activeTab = useUiStore((s) => s.activeTab)
  const setActiveTab = useUiStore((s) => s.setActiveTab)
  const crudeOil = useGameStore((s) => s.crudeOil)
  const missions = useMissionStore((s) => s.missions)

  const hasOilToSell = crudeOil >= 10
  const hasClaimableMission = missions.some((m) => m.completed && !m.claimed)

  function getNotification(tabId: PanelTab): boolean {
    if (tabId === 'market') return hasOilToSell
    if (tabId === 'missions') return hasClaimableMission
    return false
  }

  return (
    <div className="h-full flex flex-col">
      {/* Icon tabs — compact game-style */}
      <div className="flex items-center justify-around py-1.5 px-1"
        style={{ borderBottom: '1px solid rgba(40,35,25,0.15)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const hasNotif = getNotification(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all',
                isActive
                  ? 'text-crude-400 bg-crude-500/8'
                  : 'text-oil-600 hover:text-oil-400 hover:bg-oil-800/10'
              )}
            >
              <span className="text-[11px] leading-none">{tab.icon}</span>
              <span className="text-[6px] font-bold uppercase tracking-wider leading-none">{tab.label}</span>
              {hasNotif && !isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-crude-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2.5 scrollbar-none">
        {activeTab === 'market'      && <SellPanel />}
        {activeTab === 'upgrades'    && <UpgradePanel />}
        {activeTab === 'token'       && <TokenPanel />}
        {activeTab === 'missions'    && <MissionPanel />}
        {activeTab === 'leaderboard' && <LeaderboardPanel />}
        {activeTab === 'prestige'    && <PrestigePanel />}
      </div>
    </div>
  )
}
