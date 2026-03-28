import type { MissionDefinition } from './types'

// ─── Daily Missions ────────────────────────────────────────────────────────────
// 3 active at a time, hard-refresh every 24h.
// Always mix: 1 production, 1 upgrade/build, 1 economy.

export const DAILY_MISSIONS: MissionDefinition[] = [
  {
    key: 'daily_produce_1k',
    name: 'Small Spill',
    description: 'Produce 1,000 barrels of crude oil.',
    target: 1_000,
    rewardType: 'petrodollars',
    rewardAmount: 500,
    trackEvent: 'barrels_produced',
    frequency: 'daily',
  },
  {
    key: 'daily_produce_5k',
    name: 'Gusher',
    description: 'Produce 5,000 barrels of crude oil.',
    target: 5_000,
    rewardType: 'petrodollars',
    rewardAmount: 2_500,
    trackEvent: 'barrels_produced',
    frequency: 'daily',
  },
  {
    key: 'daily_produce_25k',
    name: 'Black River',
    description: 'Produce 25,000 barrels of crude oil.',
    target: 25_000,
    rewardType: 'petrodollars',
    rewardAmount: 12_500,
    trackEvent: 'barrels_produced',
    frequency: 'daily',
  },
  {
    key: 'daily_sell_500',
    name: 'Quick Sale',
    description: 'Sell crude oil 500 times.',
    target: 500,
    rewardType: 'petrodollars',
    rewardAmount: 1_000,
    trackEvent: 'oil_sold',
    frequency: 'daily',
  },
  {
    key: 'daily_upgrade_3',
    name: 'Maintenance Day',
    description: 'Upgrade any building 3 times.',
    target: 3,
    rewardType: 'petrodollars',
    rewardAmount: 1_500,
    trackEvent: 'building_upgraded',
    frequency: 'daily',
  },
  {
    key: 'daily_refine_200',
    name: 'Crack the Crude',
    description: 'Refine 200 barrels of crude oil.',
    target: 200,
    rewardType: 'petrodollars',
    rewardAmount: 2_000,
    trackEvent: 'oil_refined',
    frequency: 'daily',
  },
  {
    key: 'daily_build_1',
    name: 'Break Ground',
    description: 'Construct a new building.',
    target: 1,
    rewardType: 'petrodollars',
    rewardAmount: 800,
    trackEvent: 'building_built',
    frequency: 'daily',
  },
]

// ─── Weekly Challenges ─────────────────────────────────────────────────────────
// 1 active, 7-day window. Higher effort, $CRUDE rewards.

export const WEEKLY_MISSIONS: MissionDefinition[] = [
  {
    key: 'weekly_unlock_3_tiles',
    name: 'Expand the Empire',
    description: 'Unlock 3 new tiles this week.',
    target: 3,
    rewardType: 'petrodollars',
    rewardAmount: 50_000,
    trackEvent: 'tile_unlocked',
    frequency: 'weekly',
  },
  {
    key: 'weekly_produce_100k',
    name: 'Oil Rush',
    description: 'Produce 100,000 barrels this week.',
    target: 100_000,
    rewardType: 'petrodollars',
    rewardAmount: 75_000,
    trackEvent: 'barrels_produced',
    frequency: 'weekly',
  },
  {
    key: 'weekly_upgrade_10',
    name: 'Industrial Overhaul',
    description: 'Upgrade buildings 10 times this week.',
    target: 10,
    rewardType: 'petrodollars',
    rewardAmount: 25_000,
    trackEvent: 'building_upgraded',
    frequency: 'weekly',
  },
  {
    key: 'weekly_refine_2k',
    name: 'Refinery Week',
    description: 'Refine 2,000 barrels this week.',
    target: 2_000,
    rewardType: 'petrodollars',
    rewardAmount: 40_000,
    trackEvent: 'oil_refined',
    frequency: 'weekly',
  },
  {
    key: 'weekly_buy_2_upgrades',
    name: 'Tech Sprint',
    description: 'Purchase 2 global upgrades this week.',
    target: 2,
    rewardType: 'petrodollars',
    rewardAmount: 30_000,
    trackEvent: 'upgrade_purchased',
    frequency: 'weekly',
  },
]

// ─── Lifetime Missions (one-time) ─────────────────────────────────────────────
// These are cumulative / permanent unlocks. Never expire.

export const LIFETIME_MISSIONS: MissionDefinition[] = [
  {
    key: 'lifetime_first_building',
    name: 'Wildcatter\'s First Drill',
    description: 'Build your first oil-producing structure.',
    target: 1,
    rewardType: 'petrodollars',
    rewardAmount: 200,
    trackEvent: 'building_built',
    frequency: 'lifetime',
  },
  {
    key: 'lifetime_first_refinery',
    name: 'Black Gold Alchemist',
    description: 'Build your first refinery.',
    target: 1,
    rewardType: 'petrodollars',
    rewardAmount: 5_000,
    trackEvent: 'building_built',
    frequency: 'lifetime',
  },
  {
    key: 'lifetime_first_upgrade',
    name: 'Tune-Up',
    description: 'Purchase your first global upgrade.',
    target: 1,
    rewardType: 'petrodollars',
    rewardAmount: 500,
    trackEvent: 'upgrade_purchased',
    frequency: 'lifetime',
  },
  {
    key: 'lifetime_unlock_5_tiles',
    name: 'Land Baron',
    description: 'Unlock 5 tiles total.',
    target: 5,
    rewardType: 'petrodollars',
    rewardAmount: 2_000,
    trackEvent: 'tile_unlocked',
    frequency: 'lifetime',
  },
  {
    key: 'lifetime_unlock_all_ring1',
    name: 'Ring One Complete',
    description: 'Unlock all 8 Ring-1 tiles.',
    target: 8,
    rewardType: 'petrodollars',
    rewardAmount: 10_000,
    trackEvent: 'tile_unlocked',
    frequency: 'lifetime',
  },
  {
    key: 'lifetime_prestige_once',
    name: 'Born Again Driller',
    description: 'Complete your first prestige reset.',
    target: 1,
    rewardType: 'petrodollars',
    rewardAmount: 0, // prestige already rewards Black Gold
    trackEvent: 'prestige_reset',
    frequency: 'lifetime',
  },
]

/** All missions flattened — useful for lookups by key */
export const ALL_MISSIONS: MissionDefinition[] = [
  ...DAILY_MISSIONS,
  ...WEEKLY_MISSIONS,
  ...LIFETIME_MISSIONS,
]

export function getMissionByKey(key: string): MissionDefinition | undefined {
  return ALL_MISSIONS.find((m) => m.key === key)
}
