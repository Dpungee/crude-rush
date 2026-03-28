import type { GameState } from './types'
import { VALIDATION_TOLERANCE } from './constants'

export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Server-side validation of a game state save.
 * Checks that the delta between previous and current state is plausible
 * given the player's production rate and elapsed time.
 *
 * This is not foolproof but catches trivial manipulation.
 */
export function validateSaveDelta(
  previous: GameState,
  current: GameState,
  elapsedSeconds: number
): ValidationResult {
  // Version must increment
  if (current.version <= previous.version) {
    return { valid: false, reason: 'Version did not increment' }
  }

  // Check crude oil didn't increase more than possible
  const maxPossibleCrude =
    previous.crudeOil +
    current.productionRate * elapsedSeconds * VALIDATION_TOLERANCE

  if (current.crudeOil > maxPossibleCrude + 10) {
    return {
      valid: false,
      reason: `Crude oil increased beyond production capacity: ${current.crudeOil} > ${maxPossibleCrude}`,
    }
  }

  // Soft check on petrodollars — allow generous tolerance since selling is valid
  if (current.petrodollars > previous.petrodollars + previous.lifetimeBarrels * 100) {
    return {
      valid: false,
      reason: 'Petrodollars increased suspiciously',
    }
  }

  // Lifetime barrels should only increase
  if (current.lifetimeBarrels < previous.lifetimeBarrels) {
    return { valid: false, reason: 'Lifetime barrels decreased' }
  }

  // Unlocked tile count should only increase (except prestige resets)
  if (
    current.unlockedTileCount < previous.unlockedTileCount &&
    current.prestigeLevel === previous.prestigeLevel
  ) {
    return { valid: false, reason: 'Unlocked tile count decreased without prestige' }
  }

  return { valid: true }
}
