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
  { id: 'market',      label: 'SELL',     icon: '💱' },
  { id: 'upgrades',    label: 'BUILD',    icon: '⚡' },
  { id: 'token',       label: '$CRUDE',   icon: '🪙' },
  { id: 'missions',    label: 'TASKS',    icon: '🎯' },
  { id: 'leaderboard', label: 'RANK',     icon: '🏆' },
  { id: 'prestige',    label: 'RESET',    icon: '🌟' },
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
    <div className="h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(12,11,9,0.97) 0%, rgba(10,9,7,0.98) 100%)',
        borderLeft: '1px solid rgba(50,45,35,0.2)',
      }}
    >
      {/* Tab bar — compact, no emojis as primary, text-driven */}
      <div className="flex overflow-x-auto scrollbar-none"
        style={{ borderBottom: '1px solid rgba(50,45,35,0.25)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const hasNotif = getNotification(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex-1 min-w-0 py-2 text-[8px] font-black uppercase tracking-wider transition-all text-center',
                isActive
                  ? 'text-crude-400'
                  : 'text-oil-600 hover:text-oil-400'
              )}
            >
              {tab.label}
              {/* Active indicator — bottom line */}
              {isActive && (
                <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-crude-500 rounded-full" />
              )}
              {/* Notification dot */}
              {hasNotif && !isActive && (
                <span className="absolute top-1.5 right-[15%] w-1 h-1 rounded-full bg-crude-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-none">
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
