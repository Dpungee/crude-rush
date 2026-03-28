// Re-export all engine types for convenience
export type {
  BuildingType,
  UpgradeType,
  ResourceType,
  MissionRewardType,
  GridCell,
  BuildingDefinition,
  UpgradeDefinition,
  MissionDefinition,
  GameEventType,
  GameEvent,
  GameState,
  PlayerData,
  MissionProgress,
  LeaderboardEntry,
  DailyRewardInfo,
  ServerGameState,
} from '@/engine/types'

// UI-specific types
export type PanelTab = 'upgrades' | 'missions' | 'leaderboard' | 'prestige'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'reward'
  duration?: number
}
