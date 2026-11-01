import {AWAKENING_MULTIPLIERS,BLUE_MULTIPLIERS,AWAKENED_DARK_LOSS} from '../special/config'
import type {EffectContext} from '../../domain/special'
import { isAttributes, type AttributeId, type Attributes } from '../../domain/attributes'
import { isTier, type GameState, type Slime } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { randomUnit } from './inheritance'

/** All Phase 3B coefficients are provisional, not user-approved balance. */
export const EFFECTS = Object.freeze({
  levelSlope: 0.30, fireRate: 0.08, goldRate: 0.15, darkRate: 1,
  saleComboRate: 0.05, darkLossChance: 0.20,
  lightRate: 0.10, lightCap: 0.25, iceRate: 0.015, iceCap: 0.25,
  lightningRate: 0.06, lightningCap: 0.50, iceComboRate: 0.005, tapComboRate: 0.04,
  natureBaseMs: 180_000, natureMinimumMs: 40_000,
  luckRate: 0.0075, luckComboRate: 0.005, luckCap: 0.12,
  normalChance: 0.03, normalChanceCap: 0.15, focusChance: 0.35, focusChanceCap: 0.85, focusLuckScale: 4,
  mutationBase: 0.01, mutationRate: 0.01, mutationComboRate: 0.005, mutationCap: 0.06,
  magnetRadius: 2, magnetRate: 0.6, magnetWeightCap: 4,
})
export function levelPower(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 99) throw new RangeError('Invalid attribute level')
  return 1 + EFFECTS.levelSlope * Math.log2(level)
}
export function attributePower(attributes: Attributes | undefined, id: AttributeId): number {
  const found = attributes?.find(a => a.id === id)
  return found ? levelPower(found.level) * (found.awakened?AWAKENING_MULTIPLIERS[id]:1) : 0
}
export function comboPower(a: Attributes | undefined, first: AttributeId, second: AttributeId): number {
  return Math.min(attributePower(a, first), attributePower(a, second))
}
const distance = (a: GridPosition, b: GridPosition) => Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y))
export function isResonating(slime:Slime,context:EffectContext={}){return context.blueCells?.some(c=>distance(c,slime.position)===0)??false}
export function localPower(slime:Slime,id:AttributeId,context:EffectContext={}){return attributePower(slime.attributes,id)*(isResonating(slime,context)?BLUE_MULTIPLIERS[id]:1)}
export function localCombo(slime:Slime,a:AttributeId,b:AttributeId,context:EffectContext={}){return Math.min(localPower(slime,a,context),localPower(slime,b,context))}
/** Raw light is evaluated once. Light never boosts light or sale attributes. */
export function supportMultiplier(game: GameState, slime: Slime,context:EffectContext={}): number {
  const rawLight = game.slimes.filter(s => s.id !== slime.id && distance(s.position, slime.position) <= 1)
    .reduce((sum, s) => sum + localPower(s,'light',context), 0)
  return 1 + Math.min(EFFECTS.lightCap, rawLight * EFFECTS.lightRate)
}
export function boardEffects(game: GameState,context:EffectContext={}) {
  let ice = 0, lightning = 0, nature = 0, luck = 0, combo = 0, geneticCombo = 0
  for (const s of game.slimes) {
    if(!s.attributes?.some(a=>['ice','lightning','nature','luck'].includes(a.id)))continue
    const boost = supportMultiplier(game, s,context)
    ice += localPower(s,'ice',context) * boost
    lightning += localPower(s,'lightning',context) * boost
    nature += localPower(s,'nature',context) * boost
    luck += localPower(s,'luck',context) * boost
    combo += localCombo(s,'ice','lightning',context) * boost
    geneticCombo += localCombo(s,'luck','mutation',context) * boost
  }
  const luckBonus = Math.min(EFFECTS.luckCap, luck * EFFECTS.luckRate + geneticCombo * EFFECTS.luckComboRate)
  return {
    iceReduction: Math.min(EFFECTS.iceCap, ice * EFFECTS.iceRate + combo * EFFECTS.iceComboRate),
    tapBonus: Math.min(EFFECTS.lightningCap, lightning * EFFECTS.lightningRate + combo * EFFECTS.tapComboRate),
    natureIntervalMs: nature ? Math.max(EFFECTS.natureMinimumMs, Math.round(EFFECTS.natureBaseMs / nature)) : null,
    normalChance: Math.min(EFFECTS.normalChanceCap, EFFECTS.normalChance + luckBonus),
    focusChance: Math.min(EFFECTS.focusChanceCap, EFFECTS.focusChance + luckBonus * EFFECTS.focusLuckScale),
  }
}
/** Only participating mutation holders contribute; maximum avoids a five-input-only bonus. */
export function geneticsForGroup(game: GameState, ids: readonly string[],context:EffectContext={}) {
  const members = game.slimes.filter(s => ids.includes(s.id))
  const mutation = Math.max(0, ...members.map(s => localPower(s,'mutation',context) * supportMultiplier(game,s,context)))
  const combo = Math.max(0, ...members.map(s => localCombo(s,'luck','mutation',context) * supportMultiplier(game,s,context)))
  return { mutationChance: Math.min(EFFECTS.mutationCap, EFFECTS.mutationBase + mutation * EFFECTS.mutationRate + combo * EFFECTS.mutationComboRate),
    darkLossChance: members.some(s => s.attributes?.some(a => a.id === 'dark')) ? (members.some(s=>s.attributes?.some(a=>a.id==='dark'&&a.awakened))?AWAKENED_DARK_LOSS:EFFECTS.darkLossChance) : 0 }
}
/** One sale quote shared by UI and committed sale; GOLD event rewards stay separate. */
export function saleValue(slime: Pick<Slime, 'tier' | 'attributes'>, availableGOLD = Number.MAX_SAFE_INTEGER): number {
  if (!isTier(slime.tier) || !isAttributes(slime.attributes ?? []) || !Number.isSafeInteger(availableGOLD) || availableGOLD < 0) throw new RangeError('Invalid sale')
  const a = slime.attributes, base = 2 ** slime.tier
  const fire = attributePower(a, 'fire')
  const added = fire ? Math.ceil(base * EFFECTS.fireRate * fire) : 0
  const value = Math.floor((base + added) * (1 + EFFECTS.goldRate * attributePower(a, 'gold')) *
    (1 + EFFECTS.darkRate * attributePower(a, 'dark')) * (1 + EFFECTS.saleComboRate * comboPower(a, 'fire', 'gold')))
  return Math.min(value, availableGOLD, Number.MAX_SAFE_INTEGER)
}
export function specialCellWeights(game: GameState, cells: readonly GridPosition[],context:EffectContext={}): readonly number[] {
  return cells.map(cell => 1 + Math.min(EFFECTS.magnetWeightCap - 1, game.slimes.reduce((sum, s) => {
    const d = distance(cell, s.position)
    return sum + (d > 0 && d <= EFFECTS.magnetRadius ? EFFECTS.magnetRate * localPower(s,'magnet',context) * supportMultiplier(game,s,context) / d : 0)
  }, 0)))
}
export function drawSpecialCell(game: GameState, cells: readonly GridPosition[], random: () => number,context:EffectContext={}): GridPosition {
  if (!cells.length) throw new RangeError('No empty cell')
  const weights = specialCellWeights(game,cells,context)
  let threshold = randomUnit(random) * weights.reduce((a,b) => a+b,0)
  for (let i=0;i<cells.length;i++) { threshold -= weights[i]!; if (threshold < 0) return cells[i]! }
  return cells[cells.length-1]!
}
