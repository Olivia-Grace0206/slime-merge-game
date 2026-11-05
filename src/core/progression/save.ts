import { moneyJSON, isGold } from './money'
import type { GameState } from '../../domain/game'
import { isGameState } from '../board/state'
import { legacyGenerationRules, isLegacyWallet, type Wallet } from './economy'
import { isValidGeneratedTier, type GeneratorState } from './generation'

/**
 * Portable schema for later LocalStorage integration. The Core never touches
 * browser storage or Date.now(); the adapter will provide save time and bytes.
 */
export const PROGRESSION_SAVE_VERSION = 1

export type ProgressionSnapshot = Readonly<{
  version: 1
  savedAtMs: number
  nextId: number
  game: GameState
  wallet: Wallet
  generator: GeneratorState
}>

export function isProgressionSnapshot(value: unknown): value is ProgressionSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const s = value as ProgressionSnapshot
  if (s.version !== PROGRESSION_SAVE_VERSION ||
    !Number.isSafeInteger(s.savedAtMs) || s.savedAtMs < 0 ||
    !Number.isSafeInteger(s.nextId) || s.nextId < 0 ||
    !isGameState(s.game) || !isLegacyWallet(s.wallet) ||
    !s.generator || !Array.isArray(s.generator.storedTiers)) return false
  const g = s.generator
  const rules = legacyGenerationRules(s.wallet)
  return (
    Number.isSafeInteger(g.updatedAtMs) && g.updatedAtMs >= 0 &&
    Number.isSafeInteger(g.progressMs) && g.progressMs >= 0 &&
    g.progressMs < rules.intervalMs &&
    Number.isSafeInteger(g.totalGenerated) && g.totalGenerated >= g.storedTiers.length &&
    g.storedTiers.length <= rules.capacity &&
    g.storedTiers.every((tier) => isValidGeneratedTier(tier, s.game.highestTierReached)) &&
    s.savedAtMs >= g.updatedAtMs
  )
}

export function encodeProgression(snapshot: ProgressionSnapshot): string {
  if (!isProgressionSnapshot(snapshot)) throw new RangeError('Invalid progression snapshot')
  return moneyJSON(snapshot)
}

/** Invalid/legacy/malformed saves never overwrite the live session. */
export function decodeProgression(raw: string): ProgressionSnapshot | null {
  if (typeof raw !== 'string' || raw.length > 1_000_000) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.wallet && typeof parsed.wallet.gold === 'string' && /^(0|[1-9][0-9]{0,999})$/.test(parsed.wallet.gold)) parsed.wallet.gold = BigInt(parsed.wallet.gold)
    else if (parsed?.wallet && Number.isSafeInteger(parsed.wallet.gold) && parsed.wallet.gold >= 0) parsed.wallet.gold = BigInt(parsed.wallet.gold)
    if (!isGold(parsed?.wallet?.gold)) return null
    return isProgressionSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}
