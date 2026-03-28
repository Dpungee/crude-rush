import type { BuildingDefinition, BuildingType } from './types'

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  oil_well: {
    type: 'oil_well',
    name: 'Oil Well',
    description: 'Basic oil extraction. Slow but reliable.',
    emoji: '🛢️',
    color: '#b45309',
    baseCost: 50,
    costMultiplier: 1.5,
    // L1: 1.0 bbl/s, L2: 3.75, L3: 6.5, L4: 9.25, L5: 12.0
    baseProduction: 1.0,
    productionPerLevel: 2.75,
    unlockTileCount: 1,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
    auraRadius: 0,
    auraBonus: 0,
  },
  pump_jack: {
    type: 'pump_jack',
    name: 'Pump Jack',
    description: 'Mechanical pump. Much faster extraction.',
    emoji: '⛽',
    color: '#0369a1',
    baseCost: 500,
    costMultiplier: 1.5,
    // L1: 5.0 bbl/s, L2: 18.75, L3: 32.5, L4: 46.25, L5: 60.0
    baseProduction: 5.0,
    productionPerLevel: 13.75,
    unlockTileCount: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
    auraRadius: 0,
    auraBonus: 0,
  },
  derrick: {
    type: 'derrick',
    name: 'Derrick',
    description: 'Industrial drilling tower. Maximum output.',
    emoji: '🏗️',
    color: '#7c3aed',
    baseCost: 5_000,
    costMultiplier: 1.5,
    // L1: 25.0 bbl/s, L2: 93.75, L3: 162.5, L4: 231.25, L5: 300.0
    baseProduction: 25.0,
    productionPerLevel: 68.75,
    unlockTileCount: 13,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
    auraRadius: 0,
    auraBonus: 0,
  },
  oil_terminal: {
    type: 'oil_terminal',
    name: 'Oil Terminal',
    description: 'Distribution hub. Boosts all producers within 1 tile by +20%.',
    emoji: '🗼',
    color: '#d97706',
    baseCost: 50_000,
    costMultiplier: 2.0,
    baseProduction: 0,      // no direct production
    productionPerLevel: 0,
    unlockTileCount: 22,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
    // Boosts producers in a 3×3 area (Chebyshev radius 1)
    auraRadius: 1,
    auraBonus: 0.20,        // +20% per terminal in range
  },
  storage_tank: {
    type: 'storage_tank',
    name: 'Storage Tank',
    description: 'Increases crude oil storage capacity.',
    emoji: '🏭',
    color: '#047857',
    baseCost: 150,
    costMultiplier: 1.4,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockTileCount: 1,
    // L1: +500, L2: +1,500, L3: +3,500, L4: +7,500, L5: +15,500
    baseStorageBonus: 500,
    storagePerLevel: 1_000,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
    auraRadius: 0,
    auraBonus: 0,
  },
  refinery: {
    type: 'refinery',
    name: 'Refinery',
    description: 'Converts crude oil into 2× value refined oil.',
    emoji: '🔥',
    color: '#dc2626',
    baseCost: 1_500,
    costMultiplier: 1.6,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockTileCount: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    // L1: 2.0 crude/s → 1.0 refined/s, L2: 4.0/s, L3: 6.0/s, L4: 8.0/s, L5: 10.0/s
    baseRefineryRate: 2.0,
    refineryRatePerLevel: 2.0,
    auraRadius: 0,
    auraBonus: 0,
  },
}

/** Get the cost of building at a given level (level 1 = first purchase) */
export function getBuildingCost(type: BuildingType, level: number): number {
  const def = BUILDING_DEFINITIONS[type]
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, level - 1))
}

/** Get production rate for a building at a given level */
export function getBuildingProduction(type: BuildingType, level: number): number {
  const def = BUILDING_DEFINITIONS[type]
  return def.baseProduction + def.productionPerLevel * (level - 1)
}

/** Get storage bonus for a building at a given level */
export function getBuildingStorageBonus(type: BuildingType, level: number): number {
  const def = BUILDING_DEFINITIONS[type]
  if (def.baseStorageBonus === 0) return 0
  return def.baseStorageBonus + def.storagePerLevel * (level - 1)
}

/** Get refinery throughput (crude/s consumed) for a building at a given level */
export function getBuildingRefineryRate(type: BuildingType, level: number): number {
  const def = BUILDING_DEFINITIONS[type]
  if (def.baseRefineryRate === 0) return 0
  return def.baseRefineryRate + def.refineryRatePerLevel * (level - 1)
}

/** Get the cost to upgrade a building from current level to next */
export function getBuildingUpgradeCost(type: BuildingType, currentLevel: number): number {
  return getBuildingCost(type, currentLevel + 1)
}

/** Check if a building type is available at the current unlocked tile count */
export function isBuildingAvailable(type: BuildingType, unlockedTileCount: number): boolean {
  return unlockedTileCount >= BUILDING_DEFINITIONS[type].unlockTileCount
}

/** Get all buildings available at a given unlocked tile count */
export function getAvailableBuildings(unlockedTileCount: number): BuildingType[] {
  return (Object.keys(BUILDING_DEFINITIONS) as BuildingType[]).filter(
    (type) => isBuildingAvailable(type, unlockedTileCount)
  )
}
