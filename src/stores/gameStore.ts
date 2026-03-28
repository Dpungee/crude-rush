import { create } from 'zustand'
import type { GameState, GridCell, BuildingType, UpgradeType, ServerGameState } from '@/engine/types'
import { tick } from '@/engine/tick'
import { recalculateDerivedStats } from '@/engine/production'
import { getBuildingCost, getBuildingUpgradeCost } from '@/engine/buildings'
import { getUpgradeCost, canPurchaseUpgrade } from '@/engine/upgrades'
import { STARTING_PETRODOLLARS, STARTING_STORAGE, GRID_SIZES, GRID_EXPAND_COSTS, CRUDE_OIL_SELL_RATE, REFINED_OIL_SELL_RATE } from '@/engine/constants'

function createEmptyGrid(size: number): GridCell[] {
  const cells: GridCell[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push({ x, y, building: null, level: 0, builtAt: null, pendingOil: 0 })
    }
  }
  return cells
}

function createInitialUpgrades(): Record<UpgradeType, number> {
  return {
    well_speed: 0,
    storage_cap: 0,
    refinery_eff: 0,
    auto_collect: 0,
    offline_duration: 0,
  }
}

export function createInitialGameState(): GameState {
  return {
    crudeOil: 0,
    refinedOil: 0,
    petrodollars: STARTING_PETRODOLLARS,
    gridSize: 3,
    cells: createEmptyGrid(3),
    productionRate: 0,
    storageCapacity: STARTING_STORAGE,
    refineryRate: 0,
    upgrades: createInitialUpgrades(),
    prestigeLevel: 0,
    prestigeMultiplier: 1.0,
    lifetimeBarrels: 0,
    lifetimePetrodollars: 0,
    lastTickAt: Date.now(),
    version: 1,
  }
}

interface GameActions {
  // Core tick
  tick: () => void

  // Building actions
  buildOnCell: (x: number, y: number, building: BuildingType) => boolean
  upgradeBuilding: (x: number, y: number) => boolean
  collectFromCell: (x: number, y: number) => number

  // Upgrade actions
  purchaseUpgrade: (type: UpgradeType) => boolean

  // Grid actions
  expandGrid: () => boolean

  // Economy
  sellCrudeOil: (amount: number) => boolean
  sellRefinedOil: (amount: number) => boolean

  // Persistence
  hydrate: (server: ServerGameState) => void
  serialize: () => ServerGameState
  reset: () => void

  // Internal
  _recalculate: () => void
}

type GameStore = GameState & GameActions

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),

  tick: () => {
    const state = get()
    const now = Date.now()
    const deltaMs = Math.min(now - state.lastTickAt, 5000) // Cap at 5s per tick
    if (deltaMs <= 0) return

    const newState = tick(state, deltaMs)
    set({
      crudeOil: newState.crudeOil,
      refinedOil: newState.refinedOil,
      lifetimeBarrels: newState.lifetimeBarrels,
      lastTickAt: now,
    })
  },

  buildOnCell: (x, y, buildingType) => {
    const state = get()
    const cellIndex = state.cells.findIndex((c) => c.x === x && c.y === y)
    if (cellIndex === -1) return false

    const cell = state.cells[cellIndex]
    if (cell.building !== null) return false

    const cost = getBuildingCost(buildingType, 1)
    if (state.petrodollars < cost) return false

    const newCells = [...state.cells]
    newCells[cellIndex] = {
      ...cell,
      building: buildingType,
      level: 1,
      builtAt: new Date().toISOString(),
      pendingOil: 0,
    }

    const derived = recalculateDerivedStats(newCells, state.upgrades, state.prestigeMultiplier)

    set({
      cells: newCells,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  upgradeBuilding: (x, y) => {
    const state = get()
    const cellIndex = state.cells.findIndex((c) => c.x === x && c.y === y)
    if (cellIndex === -1) return false

    const cell = state.cells[cellIndex]
    if (!cell.building) return false

    const cost = getBuildingUpgradeCost(cell.building, cell.level)
    if (state.petrodollars < cost) return false

    const newCells = [...state.cells]
    newCells[cellIndex] = { ...cell, level: cell.level + 1 }

    const derived = recalculateDerivedStats(newCells, state.upgrades, state.prestigeMultiplier)

    set({
      cells: newCells,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  collectFromCell: (x, y) => {
    // In the current model, oil goes directly to storage.
    // This is a "tap" action that gives a small bonus burst.
    const state = get()
    const bonus = state.productionRate * 2 // 2 seconds of production as bonus
    const spaceAvailable = state.storageCapacity - state.crudeOil
    const collected = Math.min(bonus, spaceAvailable)

    if (collected > 0) {
      set({
        crudeOil: state.crudeOil + collected,
        lifetimeBarrels: state.lifetimeBarrels + collected,
      })
    }
    return collected
  },

  purchaseUpgrade: (type) => {
    const state = get()
    const currentLevel = state.upgrades[type]
    if (!canPurchaseUpgrade(type, currentLevel)) return false

    const cost = getUpgradeCost(type, currentLevel)
    if (state.petrodollars < cost) return false

    const newUpgrades = { ...state.upgrades, [type]: currentLevel + 1 }
    const derived = recalculateDerivedStats(state.cells, newUpgrades, state.prestigeMultiplier)

    set({
      upgrades: newUpgrades,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  expandGrid: () => {
    const state = get()
    const currentSizeIndex = GRID_SIZES.indexOf(state.gridSize as (typeof GRID_SIZES)[number])
    if (currentSizeIndex === -1 || currentSizeIndex >= GRID_SIZES.length - 1) return false

    const nextSize = GRID_SIZES[currentSizeIndex + 1]
    const cost = GRID_EXPAND_COSTS[currentSizeIndex + 1]

    if (state.petrodollars < cost) return false

    // Create new grid preserving existing buildings
    const newCells: GridCell[] = []
    for (let y = 0; y < nextSize; y++) {
      for (let x = 0; x < nextSize; x++) {
        const existing = state.cells.find((c) => c.x === x && c.y === y)
        if (existing) {
          newCells.push(existing)
        } else {
          newCells.push({ x, y, building: null, level: 0, builtAt: null, pendingOil: 0 })
        }
      }
    }

    const derived = recalculateDerivedStats(newCells, state.upgrades, state.prestigeMultiplier)

    set({
      gridSize: nextSize,
      cells: newCells,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  sellCrudeOil: (amount) => {
    const state = get()
    const toSell = Math.min(amount, state.crudeOil)
    if (toSell <= 0) return false

    const earned = Math.floor(toSell * CRUDE_OIL_SELL_RATE)
    set({
      crudeOil: state.crudeOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
    })
    return true
  },

  sellRefinedOil: (amount) => {
    const state = get()
    const toSell = Math.min(amount, state.refinedOil)
    if (toSell <= 0) return false

    const earned = Math.floor(toSell * REFINED_OIL_SELL_RATE)
    set({
      refinedOil: state.refinedOil - toSell,
      petrodollars: state.petrodollars + earned,
      lifetimePetrodollars: state.lifetimePetrodollars + earned,
    })
    return true
  },

  hydrate: (server) => {
    const upgrades: Record<UpgradeType, number> = {
      well_speed: 0,
      storage_cap: 0,
      refinery_eff: 0,
      auto_collect: 0,
      offline_duration: 0,
    }

    set({
      crudeOil: server.crude_oil,
      refinedOil: server.refined_oil,
      petrodollars: server.petrodollars,
      gridSize: server.grid_size,
      cells: server.grid_data,
      productionRate: server.production_rate,
      storageCapacity: server.storage_capacity,
      refineryRate: server.refinery_rate,
      upgrades,
      prestigeLevel: server.prestige_level,
      prestigeMultiplier: server.prestige_multiplier,
      lifetimeBarrels: server.lifetime_barrels,
      lifetimePetrodollars: server.lifetime_petrodollars,
      lastTickAt: new Date(server.last_tick_at).getTime(),
      version: server.version,
    })

    // Recalculate derived stats from hydrated data
    get()._recalculate()
  },

  serialize: (): ServerGameState => {
    const s = get()
    return {
      wallet_address: '', // filled by caller
      crude_oil: s.crudeOil,
      refined_oil: s.refinedOil,
      petrodollars: s.petrodollars,
      grid_size: s.gridSize,
      grid_data: s.cells,
      production_rate: s.productionRate,
      storage_capacity: s.storageCapacity,
      refinery_rate: s.refineryRate,
      last_tick_at: new Date(s.lastTickAt).toISOString(),
      version: s.version,
      prestige_level: s.prestigeLevel,
      prestige_multiplier: s.prestigeMultiplier,
      lifetime_barrels: s.lifetimeBarrels,
      lifetime_petrodollars: s.lifetimePetrodollars,
    }
  },

  reset: () => {
    set(createInitialGameState())
  },

  _recalculate: () => {
    const state = get()
    const derived = recalculateDerivedStats(state.cells, state.upgrades, state.prestigeMultiplier)
    set(derived)
  },
}))
