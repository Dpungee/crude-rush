import type { BuildingDefinition, BuildingType } from './types'

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  oil_well: {
    type: 'oil_well',
    name: 'Oil Well',
    description: 'Basic oil extraction. Slow but reliable.',
    emoji: '🛢️',
    baseCost: 50,
    costMultiplier: 1.5,
    baseProduction: 0.5,
    productionPerLevel: 0.2,
    unlockGridSize: 3,
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
    baseCost: 500,
    costMultiplier: 1.5,
    baseProduction: 2.0,
    productionPerLevel: 0.8,
    unlockGridSize: 5,
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
    baseCost: 5_000,
    costMultiplier: 1.5,
    baseProduction: 10.0,
    productionPerLevel: 4.0,
    unlockGridSize: 7,
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
    baseCost: 200,
    costMultiplier: 1.4,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockGridSize: 3,
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
    baseCost: 1_000,
    costMultiplier: 1.6,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockGridSize: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 1.0,
    refineryRatePerLevel: 0.5,
  },
  pipeline: {
    type: 'pipeline',
    name: 'Pipeline',
    description: 'Connects wells to refinery. Boosts flow by 10%.',
    emoji: '🔗',
    baseCost: 300,
    costMultiplier: 1.3,
    baseProduction: 0,
    productionPerLevel: 0,
    unlockGridSize: 5,
    baseStorageBonus: 0,
    storagePerLevel: 0,
    baseRefineryRate: 0,
    refineryRatePerLevel: 0,
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

/** Check if a building type is unlocked at the current grid size */
export function isBuildingUnlocked(type: BuildingType, gridSize: number): boolean {
  return gridSize >= BUILDING_DEFINITIONS[type].unlockGridSize
}

/** Get all buildings unlocked at a given grid size */
export function getUnlockedBuildings(gridSize: number): BuildingType[] {
  return (Object.keys(BUILDING_DEFINITIONS) as BuildingType[]).filter(
    (type) => isBuildingUnlocked(type, gridSize)
  )
}
