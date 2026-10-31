import type { DropPlan } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { applyPlan } from '../merge/apply'
import { samePosition } from '../grid/coordinates'
import { advanceGenerator, tapGenerator, newGenerator, withdrawToCell, type GeneratorRules } from './generation'
import { freshWallet, generationRules, purchaseUpgrade, sellSlime, type UpgradeKey } from './economy'
import type { ProgressionSnapshot } from './save'

/** All numbers are provisional; selected by the 4x4 simulations, never user-approved balance. */
export const EXPERIMENTAL_PHASE2 = Object.freeze({
  centerSlope: 0.92, spreadRatio: 0.10, minimumSpread: 1, maximumSpread: 1.8,
  eventMinDelayMs: 60_000, eventExtraDelayMs: 60_000,
  eventLifetimeMs: 45_000, paymentIntervalMs: 700, goldRewardRate: 0.05,
})
export type CellEvent = Readonly<{
  id: string; sequence: number; cell: GridPosition; expiresAtMs: number
  tier: number | null; sourceId: string | null; attributeCount: number
  paid: number; receivedGOLD: number; unitGOLD: number; nextPaymentAtMs: number
}>
export type Session = Omit<ProgressionSnapshot, 'version'> & Readonly<{
  version: 2; sequence: number; eventSequence: number; nextEventAtMs: number
  event: CellEvent | null; lastEvent: Readonly<{ id: string; receivedGOLD: number }> | null; protectedIds: readonly string[]; reducedEffects: boolean
}>
export type Command =
  | { type: 'tick' }
  | { type: 'tap' }
  | { type: 'withdraw'; target: GridPosition; expectedId: number }
  | { type: 'drop'; plan: DropPlan }
  | { type: 'sell'; id: string }
  | { type: 'buy'; key: UpgradeKey; expectedLevel: number }
  | { type: 'protect'; id: string }
  | { type: 'effects'; value: boolean }
  | { type: 'pay'; eventId: string; expectedPaid: number }

export function freshSession(nowMs: number): Session {
  return { version: 2, sequence: 0, savedAtMs: nowMs, nextId: 1,
    game: { bounds: { origin: { x: 0, y: 0 }, width: 4, height: 4 }, slimes: [], highestTierReached: 1, revision: 0 },
    wallet: freshWallet(), generator: newGenerator(nowMs),
    eventSequence: 0, nextEventAtMs: nowMs + EXPERIMENTAL_PHASE2.eventMinDelayMs,
    event: null, lastEvent: null, protectedIds: [], reducedEffects: false }
}
export function sessionRules(s: Session) {
  return { ...generationRules(s.wallet), distribution: EXPERIMENTAL_PHASE2 }
}
/** Tier growth and attribute penalty; minimum 1 GOLD and integer rounding can tie at low Tiers. */
export function goldPayment(tier: number, attributeCount: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > 40 || !Number.isInteger(attributeCount) || attributeCount < 0 || attributeCount > 10)
    throw new RangeError('Invalid reward input')
  return Math.max(1, Math.floor(2 ** tier * EXPERIMENTAL_PHASE2.goldRewardRate / (1 + attributeCount * 0.25)))
}
function unit(random: () => number): number {
  const n = random()
  if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError('Invalid random')
  return n
}
function later(now: number, delta: number) {
  const n = now + delta
  if (!Number.isSafeInteger(n)) throw new RangeError('Clock exhausted')
  return n
}
function schedule(s: Session, now: number, random: () => number): Session {
  return { ...s, nextEventAtMs: later(now, EXPERIMENTAL_PHASE2.eventMinDelayMs + Math.floor(unit(random) * EXPERIMENTAL_PHASE2.eventExtraDelayMs)) }
}
/** Pay only the current event and expected receipt, never a caller-provided old event object. */
function pay(s: Session, id: string, paid: number, now: number, random: () => number): Session {
  const e = s.event
  if (!e || e.id !== id || e.paid !== paid || e.tier === null || e.paid >= 10 || now < e.nextPaymentAtMs) return s
  const gold = s.wallet.gold + e.unitGOLD
  if (!Number.isSafeInteger(gold)) return s
  const event = { ...e, paid: e.paid + 1, receivedGOLD: e.receivedGOLD + e.unitGOLD,
    nextPaymentAtMs: later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) }
  const next = { ...s, wallet: { ...s.wallet, gold }, event }
  return event.paid === 10 ? schedule({ ...next, event: null, lastEvent: { id: e.id, receivedGOLD: event.receivedGOLD } }, now, random) : next
}
function events(s: Session, now: number, random: () => number, allowPayment: boolean): Session {
  let next = s
  if (!next.event && now >= next.nextEventAtMs) {
    const sequence = next.eventSequence + 1
    if (!Number.isSafeInteger(sequence)) throw new RangeError('Event IDs exhausted')
    const index = Math.floor(unit(random) * 16)
    next = { ...next, eventSequence: sequence, event: {
      id: `gold-${sequence}`, sequence, cell: { x: index % 4, y: Math.floor(index / 4) },
      expiresAtMs: later(now, EXPERIMENTAL_PHASE2.eventLifetimeMs), tier: null, sourceId: null,
      attributeCount: 0, paid: 0, receivedGOLD: 0, unitGOLD: 0, nextPaymentAtMs: 0,
    } }
  }
  const e = next.event
  if (!e) return next
  if (e.tier === null) {
    if (now >= e.expiresAtMs) return schedule({ ...next, event: null }, now, random)
    const slime = next.game.slimes.find(x => samePosition(x.position, e.cell))
    if (slime) next = { ...next, event: { ...e, tier: slime.tier, sourceId: slime.id,
      unitGOLD: goldPayment(slime.tier, 0), nextPaymentAtMs: later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) } }
  } else if (allowPayment) next = pay(next, e.id, e.paid, now, random)
  return next
}
/** A complete transaction. Clock and random are injected. Failure never partially updates resources. */
export function reduceSession(s: Session, command: Command, now: number, random: () => number, rulesOverride?: GeneratorRules): Session {
  try {
    if (!Number.isSafeInteger(now) || now < 0 || s.sequence >= Number.MAX_SAFE_INTEGER - 1) return s
    let next = s
    // Rebase rollback once, granting zero elapsed time. It cannot bank future credit.
    if (now < s.generator.updatedAtMs) {
      next = { ...next, generator: { ...next.generator, updatedAtMs: now },
        nextEventAtMs: later(now, Math.max(0, s.nextEventAtMs - s.savedAtMs)),
        event: s.event ? { ...s.event,
          expiresAtMs: later(now, Math.max(0, s.event.expiresAtMs - s.savedAtMs)),
          nextPaymentAtMs: s.event.tier === null ? 0 : later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) } : null }
    }
    next = { ...next, generator: advanceGenerator(next.generator, now, next.game.highestTierReached, (rulesOverride ?? sessionRules(next)), random) }
    if (command.type === 'tap') next = { ...next, generator: tapGenerator(next.generator, next.game.highestTierReached, (rulesOverride ?? sessionRules(next)), random) }
    if (command.type === 'withdraw') {
      if (command.expectedId !== s.nextId || s.nextId >= Number.MAX_SAFE_INTEGER - 2) return s
      const result = withdrawToCell(next.game, next.generator, command.target, `p-${s.nextId}`)
      if (!result.ok) return s
      next = { ...next, game: result.game, generator: result.generator, nextId: s.nextId + 1 }
    }
    if (command.type === 'drop') {
      let id = next.nextId
      const result = applyPlan(next.game, command.plan, () => `p-${id++}`)
      if (!result.ok) return s
      next = { ...next, game: result.state, nextId: id,
        protectedIds: next.protectedIds.filter(x => result.state.slimes.some(y => y.id === x)) }
    }
    if (command.type === 'sell') {
      if (next.protectedIds.includes(command.id)) return s
      const result = sellSlime(next.game, next.wallet, command.id)
      if (!result.ok) return s
      next = { ...next, game: result.game, wallet: result.wallet }
    }
    if (command.type === 'buy') {
      if (!Object.hasOwn(next.wallet.upgrades, command.key) || next.wallet.upgrades[command.key] !== command.expectedLevel) return s
      const result = purchaseUpgrade(next.wallet, command.key)
      if (!result.ok) return s
      // Resolve elapsed time at old speed first, then carry fractional progress into the new interval.
      const ratio = next.generator.progressMs / sessionRules(next).intervalMs
      next = { ...next, wallet: result.wallet }
      next = { ...next, generator: { ...next.generator, progressMs: Math.floor(ratio * sessionRules(next).intervalMs) } }
    }
    if (command.type === 'protect') {
      if (!next.game.slimes.some(x => x.id === command.id)) return s
      next = { ...next, protectedIds: next.protectedIds.includes(command.id)
        ? next.protectedIds.filter(x => x !== command.id) : [...next.protectedIds, command.id] }
    }
    if (command.type === 'effects') next = { ...next, reducedEffects: command.value }
    if (command.type === 'pay') {
      // Explicit replay requests must not fall through to normal tick payment.
      const paid = pay(next, command.eventId, command.expectedPaid, now, random)
      if (paid === next) return s
      next = paid
    } else next = events(next, now, random, command.type === 'tick')
    return { ...next, savedAtMs: now, sequence: s.sequence + 1 }
  } catch {
    return s
  }
}
