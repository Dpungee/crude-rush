// ============================================================
// Crude Rush - Game Engine Types
// Pure TypeScript, no React dependencies
// ============================================================

export type BuildingType =
  | 'oil_well'
  | 'pump_jack'
  | 'derrick'
  | 'storage_tank'
  | 'refinery'
  | 'pipeline'

export type UpgradeType =
  | 'well_speed'
  | 'storage_cap'
  | 'refinery_eff'
  | 'auto_collect'
  | 'offline_duration'

export type ResourceType = 'crude_oil' | 'refined_oil' | 'petrodollars'

export type MissionRewardType = 'petrodollars' | 'crude_oil' | 'unlock'

export interface GridCell {
  x: number
  y: number
  building: BuildingType | null
  level: number
  builtAt: string | null
  /** Accumulated oil since last collect (for tap-to-collect) */
  pendingOil: number
}

export interface BuildingDefinition {
  type: BuildingType
  name: string
  description: string
  emoji: string
  baseCost: number
  costMultiplier: number
  baseProduction: number
  productionPerLevel: number
  /** Minimum grid size required to unlock this building */
  unlockGridSize: number
  /** For storage tanks: base capacity added */
  baseStorageBonus: number
  storagePerLevel: number
  /** For refineries: base crude→refined per second */
  baseRefineryRate: number
  refineryRatePerLevel: number
}

export interface UpgradeDefinition {
  type: UpgradeType
  name: string
  description: string
  emoji: string
  baseCost: number
  costExponent: number
  maxLevel: number
  effectPerLevel: number
}

export interface MissionDefinition {
  key: string
  name: string
  description: string
  target: number
  rewardType: MissionRewardType
  rewardAmount: number
  trackEvent: GameEventType
}

export type GameEventType =
  | 'barrels_produced'
  | 'barrels_collected'
  | 'building_built'
  | 'building_upgraded'
  | 'upgrade_purchased'
  | 'grid_expanded'
  | 'oil_refined'
  | 'oil_sold'
  | 'prestige_reset'

export interface GameEvent {
  type: GameEventType
  amount: number
  timestamp: number
}

export interface GameState {
  // Resources
  crudeOil: number
  refinedOil: number
  petrodollars: number

  // Grid
  gridSize: number
  cells: GridCell[]

  // Derived stats (recalculated from buildings+upgrades)
  productionRate: number
  storageCapacity: number
  refineryRate: number

  // Upgrades
  upgrades: Record<UpgradeType, number>

  // Prestige
  prestigeLevel: number
  prestigeMultiplier: number

  // Lifetime stats (never reset by prestige)
  lifetimeBarrels: number
  lifetimePetrodollars: number

  // Timing
  lastTickAt: number

  // Versioning for optimistic concurrency
  version: number
}

export interface PlayerData {
  walletAddress: string
  displayName: string | null
  createdAt: string
  lastSeenAt: string
  loginStreak: number
  lastLoginDate: string | null
}

export interface MissionProgress {
  missionKey: string
  progress: number
  target: number
  completed: boolean
  claimed: boolean
  rewardType: MissionRewardType
  rewardAmount: number
}

export interface LeaderboardEntry {
  walletAddress: string
  displayName: string | null
  totalBarrels: number
  empireValue: number
  prestigeLevel: number
  rankBarrels: number
  rankEmpire: number
}

export interface DailyRewardInfo {
  dayNumber: number
  rewardType: ResourceType
  rewardAmount: number
  available: boolean
}

/** Shape of game state as stored in / loaded from Supabase */
export interface ServerGameState {
  wallet_address: string
  crude_oil: number
  refined_oil: number
  petrodollars: number
  grid_size: number
  grid_data: GridCell[]
  production_rate: number
  storage_capacity: number
  refinery_rate: number
  last_tick_at: string
  version: number
  // From players table
  prestige_level: number
  prestige_multiplier: number
  lifetime_barrels: number
  lifetime_petrodollars: number
}
