import type { UpgradeDefinition, UpgradeType } from './types'

export const UPGRADE_DEFINITIONS: Record<UpgradeType, UpgradeDefinition> = {
  extraction_speed: {
    type: 'extraction_speed',
    name: 'Extraction Speed',
    description: 'All producers generate 20% more crude per level.',
    emoji: '⚡',
    baseCost: 200,
    costExponent: 1.18,
    maxLevel: 25,
    effectPerLevel: 0.20,
  },
  storage_expansion: {
    type: 'storage_expansion',
    name: 'Storage Expansion',
    description: 'Increases base storage capacity by 200 bbl per level.',
    emoji: '📦',
    baseCost: 120,
    costExponent: 1.14,
    maxLevel: 25,
    effectPerLevel: 200,
  },
  auto_sell: {
    type: 'auto_sell',
    name: 'Auto-Sell',
    description: 'Automatically sells crude oil at 60% of market rate. Level 1 enables it.',
    emoji: '🤖',
    baseCost: 1_500,
    costExponent: 1.6,
    maxLevel: 5,
    effectPerLevel: 0.1, // +10% sell efficiency per level above 1
  },
  offline_duration: {
    type: 'offline_duration',
    name: 'Night Shift',
    description: 'Extends offline income window by 2 hours per level (base: 8h).',
    emoji: '🌙',
    baseCost: 400,
    costExponent: 1.3,
    maxLevel: 8,
    effectPerLevel: 7_200, // seconds
  },
}

export function getUpgradeCost(type: UpgradeType, currentLevel: number): number {
  const def = UPGRADE_DEFINITIONS[type]
  return Math.floor(def.baseCost * Math.pow(def.costExponent, currentLevel))
}

export function canPurchaseUpgrade(type: UpgradeType, currentLevel: number): boolean {
  return currentLevel < UPGRADE_DEFINITIONS[type].maxLevel
}

/** Production multiplier from extraction_speed upgrade */
export function getExtractionSpeedMultiplier(level: number): number {
  return 1 + UPGRADE_DEFINITIONS.extraction_speed.effectPerLevel * level
}

/** Additional storage capacity from storage_expansion upgrade */
export function getStorageExpansionBonus(level: number): number {
  return UPGRADE_DEFINITIONS.storage_expansion.effectPerLevel * level
}

/** Max offline seconds given Night Shift level */
export function getMaxOfflineSeconds(level: number): number {
  return 28_800 + UPGRADE_DEFINITIONS.offline_duration.effectPerLevel * level
}

export function isAutoSellEnabled(level: number): boolean {
  return level >= 1
}

/** Auto-sell rate as a fraction of market price */
export function getAutoSellRate(level: number): number {
  if (level === 0) return 0
  return 0.5 + UPGRADE_DEFINITIONS.auto_sell.effectPerLevel * (level - 1)
}
