import { baseSaleValue } from './money'
import { freshLandBounds, purchaseLand, type PurchasablePlot } from './land'
import type {SpecialState} from '../../domain/special'
import {freshSpecials,effectContext,availableSpecialCells,syncPurple,nextSpecialBoundary,finishSpecialBoundary,spawnSpecials,rebaseSpecialClock} from '../special/state'
import { stripAttributes } from '../attributes/strip'
import { boardEffects, drawSpecialCell } from '../attributes/effects'
import { FOCUS_COST, withdrawFocused, type GenerationMode } from './focus'
import { RESEARCH_CAPS, EXPERIMENTAL_RESEARCH, researchCost, frequencyCost } from './research'
import type { DropPlan } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { applyPlan } from '../merge/apply'
import { samePosition } from '../grid/coordinates'
import { advanceGenerator, tapGenerator, newGenerator, withdrawRandom, emptyCells, type GeneratorRules } from './generation'
import { freshWallet, GENERATION_PACE, generationRules, purchaseUpgrade, sellSlime, type UpgradeKey } from './economy'
import type { ProgressionSnapshot } from './save'

/** Distribution/reward/cooldown values are provisional. 350ms × 10 is the approved initial cadence. */
export const EXPERIMENTAL_PHASE2 = Object.freeze({
  centerSlope: 0.90, spreadRatio: 0.10, minimumSpread: 1, maximumSpread: 1.8,
  eventMinDelayMs: 60_000, eventExtraDelayMs: 60_000,
  eventLifetimeMs: 45_000, paymentIntervalMs: 350, goldRewardRate: 0.05,
})
export type CellEvent = Readonly<{
  rewardVersion?: 1 | 2 | 3; id: string; sequence: number; cell: GridPosition; expiresAtMs: number
  tier: number | null; sourceId: string | null; attributeCount: number
  paid: number; receivedGOLD: bigint; cappedGOLD?: bigint; unitGOLD: bigint; nextPaymentAtMs: number
}>
export type Session = Omit<ProgressionSnapshot, 'version'> & Readonly<{
  version: 8; specials:SpecialState; generationMode: GenerationMode; focusedGenerated: number; nature: Readonly<{progressMs: number; updatedAtMs: number; totalGenerated: number}>; researchLevel: number; researchMaxTier: number; goldCellUnlocked: boolean; goldFrequencyLevel: number; goldFormat: 'full' | 'compact'; sequence: number; eventSequence: number; nextEventAtMs: number
  event: CellEvent | null; lastEvent: Readonly<{ id: string; receivedGOLD: bigint; paid?: number }> | null; protectedIds: readonly string[]; reducedEffects: boolean
}>
export type Command =
  | { type: 'land'; plot: PurchasablePlot; expectedCount: number }
  | { type: 'research'; expectedLevel: number }
  | { type: 'gold-unlock' }
  | { type: 'gold-frequency'; expectedLevel: number }
  | { type: 'gold-format'; value: 'full' | 'compact' }
  | { type: 'generation-mode'; value: GenerationMode }
  | { type: 'tick' }
  | { type: 'tap' }
  | { type: 'withdraw'; expectedId: number; expectedMode?: GenerationMode }
  | { type: 'drop'; plan: DropPlan }
  | { type: 'sell'; id: string }
  | { type: 'strip-attributes'; id: string }
  | { type: 'buy'; key: UpgradeKey; expectedLevel: number }
  | { type: 'protect'; id: string }
  | { type: 'effects'; value: boolean }
  | { type: 'pay'; eventId: string; expectedPaid: number }

export function freshSession(nowMs: number): Session {
  return { version: 8, specials:freshSpecials(nowMs), generationMode: 'normal', focusedGenerated: 0, nature: {progressMs: 0, updatedAtMs: nowMs, totalGenerated: 0}, researchLevel: 0, researchMaxTier: 5, goldCellUnlocked: false, goldFrequencyLevel: 0, goldFormat: 'full', sequence: 0, savedAtMs: nowMs, nextId: 1,
    game: { bounds: freshLandBounds(), slimes: [], highestTierReached: 1, revision: 0 },
    wallet: freshWallet(), generator: { ...newGenerator(nowMs), storedAttributes: [] },
    eventSequence: 0, nextEventAtMs: nowMs + EXPERIMENTAL_PHASE2.eventMinDelayMs,
    event: null, lastEvent: null, protectedIds: [], reducedEffects: false }
}
export function sessionRules(s: Session) {
  const base = generationRules(s.wallet), effects = boardEffects(s.game,effectContext(s))
  const intervalMs = Math.round(base.intervalMs * (1 - effects.iceReduction))
  return { ...base, intervalMs, tapAdvanceMs: Math.min(Math.floor(intervalMs * GENERATION_PACE.maxTapIntervalFraction), Math.round(base.tapAdvanceMs * (1 + effects.tapBonus))), attributeChance: effects.normalChance }

}
/** Provisional linear low-Tier floor; high-Tier rate is unchanged. Old contracts keep version 1. */
export function goldPayment(tier: number, attributeCount: number, rewardVersion: 1 | 2 | 3 = 3): bigint {
  if (!Number.isInteger(tier) || tier < 1 || tier > 40 || !Number.isInteger(attributeCount) || attributeCount < 0 || attributeCount > 10 || ![1,2,3].includes(rewardVersion))
    throw new RangeError('Invalid reward input')
  // Old contracts keep their exact historical IEEE-754 rounding, independent of new prices.
  if (rewardVersion < 3) {
    const base = 2 ** tier * EXPERIMENTAL_PHASE2.goldRewardRate
    return BigInt(Math.max(1, Math.floor((rewardVersion === 1 ? base : Math.max(tier, base)) / (1 + attributeCount * .25))))
  }
  const base = baseSaleValue(tier), numerator = base > BigInt(tier) * 20n ? base : BigInt(tier) * 20n
  const value = numerator / (5n * BigInt(4 + attributeCount))
  return value > 0n ? value : 1n
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
  return { ...s, nextEventAtMs: later(now, Math.round((EXPERIMENTAL_PHASE2.eventMinDelayMs + Math.floor(unit(random) * EXPERIMENTAL_PHASE2.eventExtraDelayMs)) * (1 - s.goldFrequencyLevel * EXPERIMENTAL_RESEARCH.frequencyDiscount))) }
}
/** Identity AND position are checked against the same transaction that credits GOLD. */
function hasSource(s: Session, e: CellEvent): boolean {
  return s.game.slimes.some(x => x.id === e.sourceId && samePosition(x.position, e.cell))
}
function finishEvent(s: Session, now: number, random: () => number): Session {
  const e = s.event!
  return schedule({ ...s, event: null, lastEvent: { id: e.id, receivedGOLD: e.receivedGOLD, paid: e.paid } }, now, random)
}
/** Pay only the current event and expected receipt, never a caller-provided old event object. */
function pay(s: Session, id: string, paid: number, now: number, random: () => number): Session {
  const e = s.event
  if (!e || e.id !== id || e.paid !== paid || e.tier === null || e.paid >= 10) return s
  if (!hasSource(s, e)) return finishEvent(s, now, random)
  if (now < e.nextPaymentAtMs) return s
  const credit = e.unitGOLD
  const gold = s.wallet.gold + credit
  const event = { ...e, paid: e.paid + 1, receivedGOLD: e.receivedGOLD + credit, cappedGOLD: (e.cappedGOLD ?? 0n) + e.unitGOLD - credit,
    nextPaymentAtMs: later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) }
  const next = { ...s, wallet: { ...s.wallet, gold }, event }
  return event.paid === 10 ? schedule({ ...next, event: null, lastEvent: { id: e.id, receivedGOLD: event.receivedGOLD } }, now, random) : next
}
function events(s: Session, now: number, random: () => number, allowPayment: boolean): Session {
  let next = s
  if (next.goldCellUnlocked && !next.event && now >= next.nextEventAtMs) {
    const sequence = next.eventSequence + 1
    if (!Number.isSafeInteger(sequence)) throw new RangeError('Event IDs exhausted')
    const cells = availableSpecialCells(next)
    if (!cells.length) return schedule(next, now, random)
    const cell = drawSpecialCell(next.game, cells, random,effectContext(next))
    next = { ...next, eventSequence: sequence, event: {
      id: `gold-${sequence}`, sequence, cell, rewardVersion: 3,
      expiresAtMs: later(now, EXPERIMENTAL_PHASE2.eventLifetimeMs), tier: null, sourceId: null,
      attributeCount: 0, paid: 0, receivedGOLD: 0n, unitGOLD: 0n, nextPaymentAtMs: 0,
    } }
  }
  const e = next.event
  if (!e) return next
  if (e.tier !== null && !hasSource(next, e)) return finishEvent(next, now, random)
  if (e.tier === null) {
    if (now >= e.expiresAtMs) return schedule({ ...next, event: null }, now, random)
    const slime = next.game.slimes.find(x => samePosition(x.position, e.cell))
    if (slime) next = { ...next, event: { ...e, tier: slime.tier, sourceId: slime.id, attributeCount: slime.attributes?.length ?? 0,
      unitGOLD: goldPayment(slime.tier, slime.attributes?.length ?? 0, e.rewardVersion ?? 1), nextPaymentAtMs: later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) } }
  } else if (allowPayment) next = pay(next, e.id, e.paid, now, random)
  return next
}
/** Advance bounded production with constant effects. */
function advanceProduction(s:Session,now:number,random:()=>number,rulesFor:(s:Session)=>GeneratorRules):Session{
 const oldRules=rulesFor(s),oldNatureInterval=boardEffects(s.game,effectContext(s)).natureIntervalMs
 let next=s
    next = { ...next, generator: advanceGenerator(next.generator, now, next.game.highestTierReached, rulesFor(next), random) }
    // Ordinary production has capacity priority. Nature shares the bounded storage, never banks a full queue.
    if (oldNatureInterval !== null) {
      const produced = advanceGenerator({...next.generator, progressMs: next.nature.progressMs, updatedAtMs: next.nature.updatedAtMs}, now,
        next.game.highestTierReached, {...oldRules, intervalMs: oldNatureInterval}, random)
      const delta = produced.totalGenerated - next.generator.totalGenerated
      next = {...next, generator: {...produced, progressMs: next.generator.progressMs}, nature: {
        progressMs: produced.progressMs, updatedAtMs: now, totalGenerated: next.nature.totalGenerated + delta}}
      if (next.generator.storedTiers.length === oldRules.capacity) next = {...next,generator:{...next.generator,progressMs:0}}
    } else next = {...next,nature:{...next.nature,progressMs:0,updatedAtMs:now}}
 return next
}
function rebaseProduction(next:Session,oldRules:GeneratorRules,oldNature:number|null,rulesFor:(s:Session)=>GeneratorRules):Session{
 const rules=rulesFor(next),nature=boardEffects(next.game,effectContext(next)).natureIntervalMs
 if(rules.intervalMs!==oldRules.intervalMs)next={...next,generator:{...next.generator,progressMs:Math.min(rules.intervalMs-1,Math.floor(next.generator.progressMs/oldRules.intervalMs*rules.intervalMs))}}
 if(nature!==oldNature)next={...next,nature:{...next.nature,progressMs:nature&&oldNature?Math.min(nature-1,Math.floor(next.nature.progressMs/oldNature*nature)):0}}
 if(next.generator.storedTiers.length===rules.capacity)next={...next,generator:{...next.generator,progressMs:0},nature:{...next.nature,progressMs:0}}
 return next
}
/** Existing events only progress offline; no missed-spawn replay. */
function advanceTimeline(s:Session,now:number,random:()=>number,rulesFor:(s:Session)=>GeneratorRules):Session{
 let next=syncPurple(s,Math.min(now,s.savedAtMs)),cursor=next.generator.updatedAtMs
 for(let step=0;step<4;step++){
  const at=nextSpecialBoundary(next,now);if(at<cursor)throw Error('Invalid chronology')
  const rules=rulesFor(next),nature=boardEffects(next.game,effectContext(next)).natureIntervalMs
  next=advanceProduction(next,at,random,rulesFor)
  next=rebaseProduction(finishSpecialBoundary(next,at,random),rules,nature,rulesFor)
  cursor=at;if(at===now)return next
 }throw Error('Too many boundaries')
}

/** A complete transaction. Clock and random are injected. Failure never partially updates resources. */
export function reduceSession(s: Session, command: Command, now: number, random: () => number, rulesOverride?: GeneratorRules): Session {
  try {
    if (!Number.isSafeInteger(now) || now < 0 || s.sequence >= Number.MAX_SAFE_INTEGER - 1) return s
    if (command.type === 'withdraw' && (command.expectedId !== s.nextId || (command.expectedMode ?? 'normal') !== s.generationMode ||
      !s.generator.storedTiers.length || !emptyCells(s.game).length ||
      (s.generationMode === 'focused' && s.generator.storedTiers.length < FOCUS_COST))) return s
    if (command.type === 'generation-mode' && command.value !== 'normal' && command.value !== 'focused') return s
    const stripped = command.type === 'strip-attributes' ? stripAttributes(s.game,command.id) : null
    if(stripped && (!stripped.ok || !stripped.changed))return s
    const reference=sessionRules(s)
    const rulesFor=(state:Session):GeneratorRules=>{const actual=sessionRules(state);return rulesOverride?{...rulesOverride,intervalMs:Math.max(1,Math.round(rulesOverride.intervalMs*actual.intervalMs/reference.intervalMs)),tapAdvanceMs:Math.round(rulesOverride.tapAdvanceMs*actual.tapAdvanceMs/reference.tapAdvanceMs),capacity:Math.round(rulesOverride.capacity*actual.capacity/reference.capacity)}:actual}

    let next = s
    // Rebase rollback once, granting zero elapsed time. It cannot bank future credit.
    if (now < s.generator.updatedAtMs) {
      next = { ...next, specials:rebaseSpecialClock(s,now), nature: {...next.nature, updatedAtMs: now}, generator: { ...next.generator, updatedAtMs: now },
        nextEventAtMs: later(now, Math.max(0, s.nextEventAtMs - s.savedAtMs)),
        event: s.event ? { ...s.event,
          expiresAtMs: later(now, Math.max(0, s.event.expiresAtMs - s.savedAtMs)),
          nextPaymentAtMs: s.event.tier === null ? 0 : later(now, EXPERIMENTAL_PHASE2.paymentIntervalMs) } : null }
    }
    next=advanceTimeline(next,now,random,rulesFor)
    const oldRules=rulesFor(next),oldNatureInterval=boardEffects(next.game,effectContext(next)).natureIntervalMs
    const progressRatio = next.generator.progressMs / oldRules.intervalMs
    const natureRatio = oldNatureInterval ? next.nature.progressMs / oldNatureInterval : 0
    if (command.type === 'generation-mode') next = {...next, generationMode:command.value}
    if (command.type === 'tap') next = { ...next, generator: tapGenerator(next.generator, next.game.highestTierReached, rulesFor(next), random) }
    if (command.type === 'withdraw') {
      if (command.expectedId !== s.nextId || s.nextId >= Number.MAX_SAFE_INTEGER - 2 || !s.generator.storedTiers.length || !emptyCells(s.game).length) return s
      const result = s.generationMode === 'focused' ? withdrawFocused(next.game,next.generator,`p-${s.nextId}`,boardEffects(next.game,effectContext(next)).focusChance,random) : withdrawRandom(next.game, next.generator, `p-${s.nextId}`, random)
      if (!result.ok) return s
      next = { ...next, game: result.game, generator: result.generator, nextId: s.nextId + 1, focusedGenerated: next.focusedGenerated + (s.generationMode === 'focused' ? 1 : 0) }
    }
    if (command.type === 'drop') {
      let id = next.nextId
      const result = applyPlan(next.game, command.plan, () => `p-${id++}`, next.researchMaxTier, random, rulesOverride?.attributeMutationChance,effectContext(next))
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
    if(stripped&&command.type==='strip-attributes')next={...next,game:stripAttributes(next.game,command.id).game}
    if (command.type === 'land') {
      const result = purchaseLand(next.game, next.wallet, command.plot, command.expectedCount)
      if (!result.ok) return s
      next = { ...next, game: result.game, wallet: result.wallet }
    }
    if (command.type === 'buy') {
      if (!Object.hasOwn(next.wallet.upgrades, command.key) || next.wallet.upgrades[command.key] !== command.expectedLevel) return s
      const result = purchaseUpgrade(next.wallet, command.key)
      if (!result.ok) return s
      // Resolve elapsed time at old speed first, then carry fractional progress into the new interval.
      next = { ...next, wallet: result.wallet }
    }
    if (command.type === 'research') {
      const lv = next.researchLevel
      if (command.expectedLevel !== lv || lv >= RESEARCH_CAPS.length - 1) return s
      const cost = researchCost(lv)
      if (next.wallet.gold < cost) return s
      next = { ...next, wallet: { ...next.wallet, gold: next.wallet.gold - cost }, researchLevel: lv + 1, researchMaxTier: RESEARCH_CAPS[lv + 1]! }
    }
    if (command.type === 'gold-unlock') {
      if (next.goldCellUnlocked || next.wallet.gold < EXPERIMENTAL_RESEARCH.goldUnlockCost) return s
      next = schedule({ ...next, wallet: { ...next.wallet, gold: next.wallet.gold - EXPERIMENTAL_RESEARCH.goldUnlockCost }, goldCellUnlocked: true }, now, random)
    }
    if (command.type === 'gold-frequency') {
      const lv = next.goldFrequencyLevel, cost = frequencyCost(lv)
      if (!next.goldCellUnlocked || command.expectedLevel !== lv || lv >= EXPERIMENTAL_RESEARCH.frequencyMaxLevel || next.wallet.gold < cost) return s
      next = { ...next, wallet: { ...next.wallet, gold: next.wallet.gold - cost }, goldFrequencyLevel: lv + 1 }
    }
    if (command.type === 'gold-format') {
      if (command.value !== 'full' && command.value !== 'compact') return s
      next = { ...next, goldFormat: command.value }
    }
    if (command.type === 'protect') {
      if (!next.game.slimes.some(x => x.id === command.id)) return s
      next = { ...next, protectedIds: next.protectedIds.includes(command.id)
        ? next.protectedIds.filter(x => x !== command.id) : [...next.protectedIds, command.id] }
    }
    if (command.type === 'effects') next = { ...next, reducedEffects: command.value }
    const newRules = rulesFor(next), newNatureInterval = boardEffects(next.game,effectContext(next)).natureIntervalMs
    if (newRules.intervalMs !== oldRules.intervalMs)
      next = {...next, generator:{...next.generator, progressMs:Math.min(newRules.intervalMs-1,Math.floor(progressRatio*newRules.intervalMs))}}
    if (newNatureInterval !== oldNatureInterval)
      next = {...next, nature:{...next.nature, progressMs:newNatureInterval ? Math.min(newNatureInterval-1,Math.floor(natureRatio*newNatureInterval)) : 0}}
    // A click can fill the last slot AFTER ordinary/nature accrual. Pause both clocks atomically.
    if (next.generator.storedTiers.length === newRules.capacity)
      next = {...next,generator:{...next.generator,progressMs:0},nature:{...next.nature,progressMs:0}}
    next=syncPurple(next,now)
    if (command.type === 'pay') {
      // Explicit replay requests must not fall through to normal tick payment.
      const paid = pay(next, command.eventId, command.expectedPaid, now, random)
      if (paid === next) return s
      next = paid
    } else next = events(next, now, random, command.type === 'tick')
    next=spawnSpecials(next,now,random)
    return { ...next, savedAtMs: now, sequence: s.sequence + 1 }
  } catch {
    return s
  }
}


