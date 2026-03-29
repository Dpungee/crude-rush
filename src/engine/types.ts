// ============================================================
// Crude Rush - Game Engine Types
// Pure TypeScript, no React dependencies
// ============================================================

export type BuildingType =
  | 'oil_well'
  | 'pump_jack'
  | 'derrick'
  | 'oil_terminal'
  | 'storage_tank'
  | 'refinery'

export type UpgradeType =
  | 'extraction_speed'
  | 'storage_expansion'
  | 'refinery_efficiency'
  | 'auto_sell'
  | 'offline_duration'
  | 'market_intel'
  | 'deep_drilling'
  | 'logistics'

export type TileStatus = 'locked' | 'available' | 'unlocked'

export type ResourceType = 'crude_oil' | 'refined_oil' | 'petrodollars'

export type MissionRewardType = 'petrodollars' | 'crude_oil' | 'unlock'

export type MissionFrequency = 'daily' | 'weekly' | 'lifetime'

export interface GridCell {
  x: number
  y: number
  status: TileStatus
  building: BuildingType | null
  level: number
  builtAt: string | null
  unlockCost: number
  /** Ring distance from center (0=HQ, 5=frontier) */
  ring: number
  /** Tile trait affecting production: normal, rich, gusher, barren */
  trait: 'normal' | 'rich' | 'gusher' | 'barren'
  /** Construction: building type being built (null = no active construction) */
  constructionType?: BuildingType | null
  /** Construction: target level when complete */
  constructionLevel?: number
  /** Construction: ISO timestamp when construction finishes */
  constructionEndsAt?: string | null
}

// ── Global Events ─────────────────────────────────────────────────────────────
export interface EventModifiers {
  productionMultiplier?: number
  sellPriceMultiplier?: number
  refinerySpeedMultiplier?: number
  upgradeTimeMultiplier?: number
  tokenRewardMultiplier?: number
}

export interface GlobalEvent {
  id: string
  name: string
  description: string
  emoji: string
  startsAt: string
  endsAt: string
  modifiers: EventModifiers
}

export interface BuildingDefinition {
  type: BuildingType
  name: string
  description: string
  emoji: string
  color: string
  baseCost: number
  costMultiplier: number
  baseProduction: number
  productionPerLevel: number
  /** Minimum unlocked tiles required to purchase */
  unlockTileCount: number
  /** Storage tanks: base capacity added */
  baseStorageBonus: number
  storagePerLevel: number
  /** Refineries: base crude→refined per second */
  baseRefineryRate: number
  refineryRatePerLevel: number
  /**
   * Oil Terminal: production aura radius (Chebyshev).
   * Buildings within this radius get an aura bonus.
   * 0 = no aura.
   */
  auraRadius: number
  auraBonus: number
}

export interface UpgradeDefinition {
  type: UpgradeType
  name: string
  description: string
  emoji: string
  baseCost: number
  /** Polynomial exponent: cost(tier) = baseCost × tier^costExponent */
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
  /** Optional $CRUDE token reward in micro-$CRUDE (÷1e6 for display). 0 = no token reward. */
  tokenMicroReward?: number
  trackEvent: GameEventType
  frequency: MissionFrequency
}

export type GameEventType =
  | 'barrels_produced'
  | 'tile_unlocked'
  | 'building_built'
  | 'building_upgraded'
  | 'upgrade_purchased'
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

  // Grid (7×7 = 49 tiles)
  plots: GridCell[]
  unlockedTileCount: number

  // Derived stats (recalculated from buildings+upgrades)
  productionRate: number
  storageCapacity: number
  refineryRate: number

  // Upgrades: level for each type
  upgrades: Record<UpgradeType, number>

  // Prestige
  prestigeLevel: number
  prestigeMultiplier: number

  // Black Gold (prestige currency)
  blackGold: number

  // XP & level
  xp: number
  xpLevel: number

  // Permanent milestone bonuses (multiplicative, compound over milestones)
  milestoneProductionBonus: number  // e.g. 1.05 after 1M milestone
  milestoneCashBonus: number        // e.g. 1.10 after 10M milestone

  // Market & economy
  /** Current market sell multiplier — sine-wave between 0.80 and 1.20 */
  marketMultiplier: number

  // Login streak
  loginStreak: number
  /** Multiplicative sell bonus from streak: 1 + STREAK_BONUS_PER_DAY × min(streak, 30) */
  streakMultiplier: number

  // Active temporary buff (e.g. day-7 reward)
  activeTempMultiplier: number
  activeTempMultiplierExpiresAt: number | null  // unix ms

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
  plots_data: GridCell[]
  unlocked_tile_count: number
  upgrades_data: Record<UpgradeType, number>
  production_rate: number
  storage_capacity: number
  refinery_rate: number
  last_tick_at: string
  version: number
  // From players table
  prestige_level: number
  prestige_multiplier: number
  black_gold: number
  xp: number
  xp_level: number
  milestone_production_bonus: number
  milestone_cash_bonus: number
  login_streak: number
  streak_multiplier: number
  lifetime_barrels: number
  lifetime_petrodollars: number
}
