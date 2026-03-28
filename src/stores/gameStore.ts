import { create } from 'zustand'
import type { GameState, GridCell, BuildingType, UpgradeType, ServerGameState } from '@/engine/types'
import { tick } from '@/engine/tick'
import { recalculateDerivedStats } from '@/engine/production'
import { getBuildingCost, getBuildingUpgradeCost } from '@/engine/buildings'
import { getUpgradeCost, canPurchaseUpgrade } from '@/engine/upgrades'
import { createInitialGrid } from '@/engine/prestige'
import {
  STARTING_PETRODOLLARS,
  STARTING_STORAGE,
  CRUDE_OIL_SELL_RATE,
  REFINED_OIL_SELL_RATE,
  GRID_SIZE,
  GRID_CENTER,
  TILE_UNLOCK_COSTS,
} from '@/engine/constants'

function createInitialUpgrades(): Record<UpgradeType, number> {
  return {
    extraction_speed: 0,
    storage_expansion: 0,
    auto_sell: 0,
    offline_duration: 0,
  }
}

export function createInitialGameState(): GameState {
  return {
    crudeOil: 0,
    refinedOil: 0,
    petrodollars: STARTING_PETRODOLLARS,
    plots: createInitialGrid(),
    unlockedTileCount: 1,
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

  // Tile actions
  unlockTile: (x: number, y: number) => boolean

  // Building actions
  buildOnCell: (x: number, y: number, building: BuildingType) => boolean
  upgradeBuilding: (x: number, y: number) => boolean

  // Upgrade actions
  purchaseUpgrade: (type: UpgradeType) => boolean

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

  unlockTile: (x, y) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (plot.status !== 'available') return false
    if (state.petrodollars < plot.unlockCost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = { ...plot, status: 'unlocked' }

    // Make adjacent locked tiles 'available' (Chebyshev neighbors)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue
        const neighborIdx = newPlots.findIndex((p) => p.x === nx && p.y === ny)
        if (neighborIdx !== -1 && newPlots[neighborIdx].status === 'locked') {
          newPlots[neighborIdx] = { ...newPlots[neighborIdx], status: 'available' }
        }
      }
    }

    const newUnlockedCount = state.unlockedTileCount + 1

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - plot.unlockCost,
      unlockedTileCount: newUnlockedCount,
      version: state.version + 1,
    })
    return true
  },

  buildOnCell: (x, y, buildingType) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (plot.status !== 'unlocked') return false
    if (plot.building !== null) return false

    const cost = getBuildingCost(buildingType, 1)
    if (state.petrodollars < cost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = {
      ...plot,
      building: buildingType,
      level: 1,
      builtAt: new Date().toISOString(),
    }

    const derived = recalculateDerivedStats(newPlots, state.upgrades, state.prestigeMultiplier)

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  upgradeBuilding: (x, y) => {
    const state = get()
    const plotIndex = state.plots.findIndex((p) => p.x === x && p.y === y)
    if (plotIndex === -1) return false

    const plot = state.plots[plotIndex]
    if (!plot.building) return false

    const cost = getBuildingUpgradeCost(plot.building, plot.level)
    if (state.petrodollars < cost) return false

    const newPlots = [...state.plots]
    newPlots[plotIndex] = { ...plot, level: plot.level + 1 }

    const derived = recalculateDerivedStats(newPlots, state.upgrades, state.prestigeMultiplier)

    set({
      plots: newPlots,
      petrodollars: state.petrodollars - cost,
      ...derived,
      version: state.version + 1,
    })
    return true
  },

  purchaseUpgrade: (type) => {
    const state = get()
    const currentLevel = state.upgrades[type]
    if (!canPurchaseUpgrade(type, currentLevel)) return false

    const cost = getUpgradeCost(type, currentLevel)
    if (state.petrodollars < cost) return false

    const newUpgrades = { ...state.upgrades, [type]: currentLevel + 1 }
    const derived = recalculateDerivedStats(state.plots, newUpgrades, state.prestigeMultiplier)

    set({
      upgrades: newUpgrades,
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
    const upgrades = createInitialUpgrades()

    set({
      crudeOil: server.crude_oil,
      refinedOil: server.refined_oil,
      petrodollars: server.petrodollars,
      plots: server.plots_data,
      unlockedTileCount: server.unlocked_tile_count,
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
      plots_data: s.plots,
      unlocked_tile_count: s.unlockedTileCount,
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
    const derived = recalculateDerivedStats(state.plots, state.upgrades, state.prestigeMultiplier)
    set(derived)
  },
}))
