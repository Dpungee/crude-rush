import type { UpgradeDefinition, UpgradeType } from './types'

export const UPGRADE_DEFINITIONS: Record<UpgradeType, UpgradeDefinition> = {
  extraction_speed: {
    type: 'extraction_speed',
    name: 'Extraction Speed',
    description: 'All producers generate +15% more crude per tier.',
    emoji: '⚡',
    baseCost: 200,
    // Polynomial: cost(tier) = 200 × tier^2.2
    // T1: $200, T2: $920, T3: $2,300, T5: $8,400, T10: $31,700
    costExponent: 2.2,
    maxLevel: 10,
    effectPerLevel: 0.15,  // +15% per tier → T10 = 2.5×
  },
  storage_expansion: {
    type: 'storage_expansion',
    name: 'Storage Expansion',
    description: 'Increases total storage capacity by 20% per tier (multiplicative).',
    emoji: '📦',
    baseCost: 100,
    // T1: $100, T2: $460, T3: $1,150, T5: $4,200
    costExponent: 2.2,
    maxLevel: 10,
    effectPerLevel: 0.20,  // +20% per tier multiplicative → T10 = 6.19×
  },
  refinery_efficiency: {
    type: 'refinery_efficiency',
    name: 'Refinery Efficiency',
    description: 'Increases crude processing throughput by +10% per tier.',
    emoji: '🔩',
    baseCost: 500,
    // T1: $500, T2: $2,300, T3: $5,750, T5: $21,000, T10: $158,500
    costExponent: 2.2,
    maxLevel: 10,
    effectPerLevel: 0.10,  // +10% throughput per tier → T10 = 2.59×
  },
  auto_sell: {
    type: 'auto_sell',
    name: 'Auto-Sell',
    description: 'Automatically sells crude oil. Level 1 enables at 50% rate; each level adds +10%.',
    emoji: '🤖',
    baseCost: 1_500,
    costExponent: 2.5,
    maxLevel: 5,
    effectPerLevel: 0.10,  // +10% sell efficiency above base 50%
  },
  offline_duration: {
    type: 'offline_duration',
    name: 'Night Shift',
    description: 'Extends offline income window by 2 hours per level (base: 8h, max: 24h).',
    emoji: '🌙',
    baseCost: 400,
    costExponent: 2.0,
    maxLevel: 8,
    effectPerLevel: 7_200, // seconds (+2h)
  },
}

/**
 * Polynomial upgrade cost: baseCost × (currentLevel + 1)^costExponent
 * currentLevel = 0 → buying T1 → cost = baseCost × 1^exp = baseCost
 * currentLevel = 1 → buying T2 → cost = baseCost × 2^exp
 */
export function getUpgradeCost(type: UpgradeType, currentLevel: number): number {
  const def = UPGRADE_DEFINITIONS[type]
  return Math.floor(def.baseCost * Math.pow(currentLevel + 1, def.costExponent))
}

export function canPurchaseUpgrade(type: UpgradeType, currentLevel: number): boolean {
  return currentLevel < UPGRADE_DEFINITIONS[type].maxLevel
}

// ─── Effect helpers ───────────────────────────────────────────────────────────

/** Production multiplier from extraction_speed: 1 + 0.15 × level */
export function getExtractionSpeedMultiplier(level: number): number {
  return 1 + UPGRADE_DEFINITIONS.extraction_speed.effectPerLevel * level
}

/**
 * Storage capacity multiplier from storage_expansion.
 * Multiplicative: (1.20)^level
 * L0: 1.0×, L5: 2.49×, L10: 6.19×
 */
export function getStorageExpansionMultiplier(level: number): number {
  return Math.pow(1 + UPGRADE_DEFINITIONS.storage_expansion.effectPerLevel, level)
}

/** @deprecated Use getStorageExpansionMultiplier — kept for backward compat */
export function getStorageExpansionBonus(level: number): number {
  return getStorageExpansionMultiplier(level)
}

/**
 * Refinery throughput multiplier from refinery_efficiency.
 * Multiplicative: (1.10)^level
 */
export function getRefineryEfficiencyMultiplier(level: number): number {
  return Math.pow(1 + UPGRADE_DEFINITIONS.refinery_efficiency.effectPerLevel, level)
}

/** Max offline seconds given Night Shift level */
export function getMaxOfflineSeconds(level: number): number {
  return 28_800 + UPGRADE_DEFINITIONS.offline_duration.effectPerLevel * level
}

export function isAutoSellEnabled(level: number): boolean {
  return level >= 1
}

/** Create a zeroed upgrades record — single source of truth for initial state */
export function createInitialUpgrades(): Record<UpgradeType, number> {
  return {
    extraction_speed: 0,
    storage_expansion: 0,
    refinery_efficiency: 0,
    auto_sell: 0,
    offline_duration: 0,
  }
}

/** Auto-sell rate as a fraction of market price (50% base + 10% per level above 1) */
export function getAutoSellRate(level: number): number {
  if (level === 0) return 0
  return 0.50 + UPGRADE_DEFINITIONS.auto_sell.effectPerLevel * (level - 1)
}
