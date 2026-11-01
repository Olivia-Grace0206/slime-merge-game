import type { GameState } from '../../domain/game'
import { isGameState } from '../board/state'
import { isAttributes } from '../../domain/attributes'
import { drawAttributes } from '../attributes/inheritance'
import { emptyCells, isValidGeneratedTier, withdrawToCell, type GeneratorState, type WithdrawResult } from './generation'
export type GenerationMode = 'normal' | 'focused'
export const FOCUS_COST = 10
/** Lowest Tier first, FIFO ties. Never spend attributed stock or either of the top two discovered Tiers. */
export function focusCandidates(game: GameState, generator: GeneratorState): readonly number[] {
  return generator.storedTiers.map((tier,index) => ({tier,index}))
    .filter(({tier,index}) => tier <= Math.max(1,game.highestTierReached-2) && (generator.storedAttributes?.[index]?.length ?? 0) === 0)
    .sort((a,b) => a.tier-b.tier || a.index-b.index).map(x => x.index)
}
/** Selection and output are one pure transaction. Surviving stock keeps relative FIFO order. */
export function withdrawFocused(game: GameState, generator: GeneratorState, newId: string, chance: number, random: () => number): WithdrawResult {
  const reject = {ok:false,game,generator}
  if (!isGameState(game) || !Array.isArray(generator.storedTiers) || !Array.from(generator.storedTiers).every(t=>isValidGeneratedTier(t,game.highestTierReached)) || !Array.isArray(generator.storedAttributes) || generator.storedAttributes.length !== generator.storedTiers.length || !Array.from(generator.storedAttributes).every(isAttributes)) return reject
  const selected = focusCandidates(game,generator).slice(0,FOCUS_COST), cells = emptyCells(game)
  if (selected.length !== FOCUS_COST || !cells.length) return reject
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) return reject
  const tier = Math.min(...selected.map(i => generator.storedTiers[i]!))
  const attrs = drawAttributes(random,chance)
  const out = withdrawToCell(game,{...generator,storedTiers:[tier],storedAttributes:[attrs]},cells[Math.floor(value*cells.length)]!,newId)
  if (!out.ok) return reject
  const used = new Set(selected)
  return {ok:true,game:out.game,generator:{...generator,storedTiers:generator.storedTiers.filter((_,i)=>!used.has(i)),storedAttributes:generator.storedAttributes.filter((_,i)=>!used.has(i))}}
}
