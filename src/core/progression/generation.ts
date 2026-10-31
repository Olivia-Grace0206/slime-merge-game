import { MAX_TIER, isTier, type GameState, type Slime } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { inBounds, isGameState } from '../board/state'
import { samePosition } from '../grid/coordinates'

/**
 * All numeric settings here are Phase 2 EXPERIMENTAL values, not approved game balance.
 * They are isolated so simulation and later player feedback can replace them.
 */
export const EXPERIMENTAL_GENERATION = Object.freeze({
  baseIntervalMs: 10_000,
  initialCapacity: 10,
  baseTapAdvanceMs: 1_000,
  centerSlope: 0.75,
  spreadRatio: 0.22,
  minimumSpread: 1,
})

export type DistributionProfile = Readonly<{
  centerSlope: number
  spreadRatio: number
  minimumSpread: number
  maximumSpread?: number
}>

export type TierWeight = Readonly<{ tier: number; probability: number }>

/** Discrete, truncated Gaussian; never rounds a continuous draw into a boundary bucket. */
export function tierWeights(
  highestTierReached: number,
  profile: DistributionProfile = EXPERIMENTAL_GENERATION,
): readonly TierWeight[] {
  if (!isTier(highestTierReached)) throw new RangeError('Invalid highest Tier')
  if (
    !Number.isFinite(profile.centerSlope) || profile.centerSlope < 0 ||
    !Number.isFinite(profile.spreadRatio) || profile.spreadRatio <= 0 ||
    !Number.isFinite(profile.minimumSpread) || profile.minimumSpread <= 0 ||
    (profile.maximumSpread !== undefined && (!Number.isFinite(profile.maximumSpread) || profile.maximumSpread < profile.minimumSpread))
  ) throw new RangeError('Invalid distribution profile')

  const mu = 1 + profile.centerSlope * (highestTierReached - 1)
  const sigma = Math.min(profile.maximumSpread ?? Infinity, Math.max(profile.minimumSpread, profile.spreadRatio * highestTierReached))
  const weights = Array.from({ length: highestTierReached }, (_, i) =>
    Math.exp(-((i + 1 - mu) ** 2) / (2 * sigma ** 2)),
  )
  const total = weights.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(total) || total <= 0) throw new RangeError('Invalid weights')
  return weights.map((weight, i) => ({ tier: i + 1, probability: weight / total }))
}

/** Caller supplies an explicit [0, 1) random value, making sampling replayable. */
export function drawTier(
  highestTierReached: number,
  unit: number,
  profile: DistributionProfile = EXPERIMENTAL_GENERATION,
): number {
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1) {
    throw new RangeError('Random value must be within [0, 1)')
  }
  let cumulative = 0
  const entries = tierWeights(highestTierReached, profile)
  for (const entry of entries) {
    cumulative += entry.probability
    if (unit < cumulative) return entry.tier
  }
  return entries[entries.length - 1]!.tier
}

export type GeneratorState = Readonly<{
  storedTiers: readonly number[]
  progressMs: number
  updatedAtMs: number
  totalGenerated: number
}>

export type GeneratorRules = Readonly<{
  intervalMs: number
  capacity: number
  tapAdvanceMs: number
  distribution?: DistributionProfile
}>

export function newGenerator(nowMs: number): GeneratorState {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new RangeError('Invalid time')
  return { storedTiers: [], progressMs: 0, updatedAtMs: nowMs, totalGenerated: 0 }
}

function checkRules(state: GeneratorState, rules: GeneratorRules, highestTier: number) {
  if (
    !isTier(highestTier) ||
    !Number.isSafeInteger(rules.intervalMs) || rules.intervalMs <= 0 ||
    !Number.isSafeInteger(rules.capacity) || rules.capacity < 1 || rules.capacity > 1000 ||
    !Number.isSafeInteger(rules.tapAdvanceMs) || rules.tapAdvanceMs <= 0 ||
    !Array.isArray(state.storedTiers) ||
    state.storedTiers.length > rules.capacity ||
    state.storedTiers.some((t) => !isTier(t) || t > highestTier) ||
    !Number.isSafeInteger(state.updatedAtMs) || state.updatedAtMs < 0 ||
    !Number.isSafeInteger(state.progressMs) || state.progressMs < 0 ||
    !Number.isSafeInteger(state.totalGenerated) || state.totalGenerated < state.storedTiers.length
  ) throw new RangeError('Invalid generator state or rules')
}

/** Generates at most free capacity regardless of elapsed offline time. */
function accrue(
  state: GeneratorState,
  milliseconds: number,
  highestTier: number,
  rules: GeneratorRules,
  randomUnit: () => number,
): GeneratorState {
  checkRules(state, rules, highestTier)
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid elapsed time')
  const free = rules.capacity - state.storedTiers.length
  if (free === 0) return { ...state, progressMs: 0 }
  const availableMs = Math.min(Number.MAX_SAFE_INTEGER, state.progressMs + milliseconds)
  const generated = Math.min(free, Math.floor(availableMs / rules.intervalMs))
  if (!Number.isSafeInteger(state.totalGenerated + generated)) throw new RangeError('Generation counter exhausted')
  const created = Array.from({ length: generated }, () =>
    drawTier(highestTier, randomUnit(), rules.distribution),
  )
  // Full capacity pauses the timer. Time while full is never banked as future credit.
  const progressMs = generated === free ? 0 : availableMs - generated * rules.intervalMs
  return {
    ...state,
    storedTiers: [...state.storedTiers, ...created],
    progressMs,
    totalGenerated: state.totalGenerated + created.length,
  }
}

/** Inject clock and random stream; no Date.now(), setInterval or global Math.random here. */
export function advanceGenerator(
  state: GeneratorState,
  nowMs: number,
  highestTier: number,
  rules: GeneratorRules,
  randomUnit: () => number,
): GeneratorState {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new RangeError('Invalid time')
  if (nowMs < state.updatedAtMs) return state // Clock rollback must not generate items.
  const next = accrue(state, nowMs - state.updatedAtMs, highestTier, rules, randomUnit)
  return { ...next, updatedAtMs: nowMs }
}

export function tapGenerator(
  state: GeneratorState,
  highestTier: number,
  rules: GeneratorRules,
  randomUnit: () => number,
): GeneratorState {
  return accrue(state, rules.tapAdvanceMs, highestTier, rules, randomUnit)
}

export type WithdrawResult = Readonly<{
  ok: boolean
  game: GameState
  generator: GeneratorState
}>

/** On failure, both board and queue stay bit-for-bit unchanged. */
export function withdrawToCell(
  game: GameState,
  generator: GeneratorState,
  target: GridPosition,
  newId: string,
): WithdrawResult {
  const reject = (): WithdrawResult => ({ ok: false, game, generator })
  if (
    !isGameState(game) || !inBounds(game.bounds, target) ||
    !generator.storedTiers.length || !isTier(generator.storedTiers[0]) ||
    !newId.trim() || game.slimes.some((s) => s.id === newId) ||
    game.slimes.some((s) => samePosition(s.position, target))
  ) return reject()
  const slime: Slime = { id: newId, tier: generator.storedTiers[0]!, position: { ...target } }
  const nextGame: GameState = {
    ...game,
    slimes: [...game.slimes, slime],
    highestTierReached: Math.max(game.highestTierReached, slime.tier),
    revision: game.revision + 1,
  }
  if (!isGameState(nextGame)) return reject()
  return {
    ok: true,
    game: nextGame,
    generator: { ...generator, storedTiers: generator.storedTiers.slice(1) },
  }
}

/** Used only by future GOLD and persistence code, not a Tier-41 bypass. */
export function isValidGeneratedTier(tier: number, highest: number): boolean {
  return isTier(tier) && isTier(highest) && tier <= highest && tier <= MAX_TIER
}

/** Stable row-major empty-cell list. Event cells remain eligible for player placement. */
export function emptyCells(game: GameState): readonly GridPosition[] {
  const { origin, width, height } = game.bounds
  return Array.from({ length: width * height }, (_, i) => ({ x: origin.x + i % width, y: origin.y + Math.floor(i / width) }))
    .filter(position => !game.slimes.some(s => samePosition(s.position, position)))
}

/** One bounded draw, no rejection loop. Empty/full queues do not consume randomness. */
export function withdrawRandom(game: GameState, generator: GeneratorState, newId: string, random: () => number): WithdrawResult {
  const reject = { ok: false, game, generator }
  if (!isGameState(game) || !generator.storedTiers.length) return reject
  const cells = emptyCells(game)
  if (!cells.length) return reject
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) return reject
  return withdrawToCell(game, generator, cells[Math.floor(value * cells.length)]!, newId)
}
