import type { UpgradeDefinition, UpgradeType } from './types'

export const UPGRADE_DEFINITIONS: Record<UpgradeType, UpgradeDefinition> = {
  well_speed: {
    type: 'well_speed',
    name: 'Drill Efficiency',
    description: 'All wells produce 15% more oil per level.',
    emoji: '⚡',
    baseCost: 100,
    costExponent: 1.15,
    maxLevel: 50,
    effectPerLevel: 0.15,
  },
  storage_cap: {
    type: 'storage_cap',
    name: 'Tank Reinforcement',
    description: 'Increases base storage capacity by 50 per level.',
    emoji: '📦',
    baseCost: 75,
    costExponent: 1.12,
    maxLevel: 50,
    effectPerLevel: 50,
  },
  refinery_eff: {
    type: 'refinery_eff',
    name: 'Catalytic Processing',
    description: 'Refineries process 20% more crude per level.',
    emoji: '🧪',
    baseCost: 200,
    costExponent: 1.18,
    maxLevel: 30,
    effectPerLevel: 0.2,
  },
  auto_collect: {
    type: 'auto_collect',
    name: 'Auto-Collector',
    description: 'Automatically collects oil from wells. Level 1 enables, higher = faster.',
    emoji: '🤖',
    baseCost: 1_000,
    costExponent: 1.5,
    maxLevel: 10,
    effectPerLevel: 1,
  },
  offline_duration: {
    type: 'offline_duration',
    name: 'Night Shift',
    description: 'Extends offline income duration by 2 hours per level.',
    emoji: '🌙',
    baseCost: 500,
    costExponent: 1.3,
    maxLevel: 8,
    effectPerLevel: 7_200, // 2 hours in seconds
  },
}

/** Get the cost of an upgrade at a given level */
export function getUpgradeCost(type: UpgradeType, currentLevel: number): number {
  const def = UPGRADE_DEFINITIONS[type]
  return Math.floor(def.baseCost * Math.pow(def.costExponent, currentLevel))
}

/** Check if an upgrade can be purchased (not at max level) */
export function canPurchaseUpgrade(type: UpgradeType, currentLevel: number): boolean {
  return currentLevel < UPGRADE_DEFINITIONS[type].maxLevel
}

/** Get the total well speed multiplier from upgrade level */
export function getWellSpeedMultiplier(level: number): number {
  return 1 + UPGRADE_DEFINITIONS.well_speed.effectPerLevel * level
}

/** Get the total storage bonus from upgrade level */
export function getStorageCapBonus(level: number): number {
  return UPGRADE_DEFINITIONS.storage_cap.effectPerLevel * level
}

/** Get the refinery efficiency multiplier from upgrade level */
export function getRefineryEffMultiplier(level: number): number {
  return 1 + UPGRADE_DEFINITIONS.refinery_eff.effectPerLevel * level
}

/** Get max offline duration in seconds given upgrade level */
export function getMaxOfflineSeconds(level: number): number {
  const { effectPerLevel } = UPGRADE_DEFINITIONS.offline_duration
  return 28_800 + effectPerLevel * level // base 8h + 2h per level
}

/** Whether auto-collect is enabled */
export function isAutoCollectEnabled(level: number): boolean {
  return level >= 1
}
