import type { GameState } from '../../domain/game'
import { isGameState } from '../board/state'
import { isAttributes } from '../../domain/attributes'
import { drawAttributes } from '../attributes/inheritance'
import { emptyCells, isValidGeneratedTier, withdrawToCell, type GeneratorState, type WithdrawResult } from './generation'
export type GenerationMode = 'normal' | 'focused'
export const FOCUS_COST = 10
/** Consume exactly the FIFO head ten, including attributed/high-Tier stock. No reroll of survivors. */
export function withdrawFocused(game: GameState, generator: GeneratorState, newId: string, chance: number, random: () => number): WithdrawResult {
  const reject = {ok:false,game,generator}
  if (!isGameState(game) || !Array.isArray(generator.storedTiers) || !Array.from(generator.storedTiers).every(t=>isValidGeneratedTier(t,game.highestTierReached)) || !Array.isArray(generator.storedAttributes) || generator.storedAttributes.length !== generator.storedTiers.length || !Array.from(generator.storedAttributes).every(isAttributes)) return reject
  const consumed = generator.storedTiers.slice(0,FOCUS_COST), cells = emptyCells(game)
  if (consumed.length !== FOCUS_COST || !cells.length) return reject
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) return reject
  const tier = Math.min(...consumed)
  const attrs = drawAttributes(random,chance)
  const out = withdrawToCell(game,{...generator,storedTiers:[tier],storedAttributes:[attrs]},cells[Math.floor(value*cells.length)]!,newId)
  if (!out.ok) return reject
  return {ok:true,game:out.game,generator:{...generator,storedTiers:generator.storedTiers.slice(FOCUS_COST),storedAttributes:generator.storedAttributes.slice(FOCUS_COST)}}
}
