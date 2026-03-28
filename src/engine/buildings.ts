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
    baseProduction: 0.5,
    productionPerLevel: 0.2,
    unlockTileCount: 1,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
  },
  pump_jack: {
    type: 'pump_jack',
    name: 'Pump Jack',
    description: 'Mechanical pump. Much faster extraction.',
    emoji: '⛽',
    color: '#0369a1',
    baseCost: 500,
    costMultiplier: 1.5,
    baseProduction: 2.0,
    productionPerLevel: 0.8,
    unlockTileCount: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
  },
  derrick: {
    type: 'derrick',
    name: 'Derrick',
    description: 'Industrial drilling tower. Maximum output.',
    emoji: '🏗️',
    color: '#7c3aed',
    baseCost: 5_000,
    costMultiplier: 1.5,
    baseProduction: 10.0,
    productionPerLevel: 4.0,
    unlockTileCount: 13,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
  },
  storage_tank: {
    type: 'storage_tank',
    name: 'Storage Tank',
    description: 'Increases crude oil storage capacity.',
    emoji: '🏭',
    color: '#047857',
    baseCost: 200,
    costMultiplier: 1.4,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockTileCount: 1,
    baseStorageBonus: 200,
    storagePerLevel: 100,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
  },
  refinery: {
    type: 'refinery',
    name: 'Refinery',
    description: 'Processes crude into valuable refined oil.',
    emoji: '🔥',
    color: '#dc2626',
    baseCost: 1_000,
    costMultiplier: 1.6,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockTileCount: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 1.0,
    refineryRatePerLevel: 0.5,
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

/** Get refinery rate for a building at a given level */
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
