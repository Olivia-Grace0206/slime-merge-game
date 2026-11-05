import type { BoardBounds, GameState } from '../../domain/game'
import { isGameState } from '../board/state'
import { isWallet, type Wallet } from './economy'

export const PLOTS = ['A', 'B', 'C', 'D'] as const
export type Plot = typeof PLOTS[number]
export type PurchasablePlot = Exclude<Plot, 'A'>
export const LAND_PRICE_CANDIDATES = Object.freeze({
  A: [128n, 2048n, 32768n], B: [512n, 8192n, 131072n], C: [2048n, 32768n, 524288n],
} as const)
/** Recommended/provisional B; never a user-approved price. */
export const LAND_PRICES = LAND_PRICE_CANDIDATES.B
export const plotAt = (x: number, y: number): Plot => PLOTS[(y >= 4 ? 2 : 0) + (x >= 4 ? 1 : 0)]!
export const freshLandBounds = (): BoardBounds => ({ origin: { x: 0, y: 0 }, width: 8, height: 8, plots: ['A'] })
export const unlockedCellCount = (bounds: BoardBounds): number => bounds.plots ? bounds.plots.length * 16 : bounds.width * bounds.height
export function canUnlock(bounds: BoardBounds, plot: PurchasablePlot): boolean {
  const plots = bounds.plots
  return !!plots && ['B','C','D'].includes(plot) && !plots.includes(plot) && (plot !== 'D' || (plots.includes('B') && plots.includes('C')))
}
export function landCost(bounds: BoardBounds): bigint | null { return bounds.plots ? LAND_PRICES[bounds.plots.length - 1] ?? null : null }
export function purchaseLand(game: GameState, wallet: Wallet, plot: PurchasablePlot, expectedCount: number) {
  const reject = { ok: false, game, wallet }
  if (!isGameState(game) || !isWallet(wallet) || game.bounds.plots?.length !== expectedCount || !canUnlock(game.bounds, plot)) return reject
  const cost = landCost(game.bounds)
  if (cost === null || wallet.gold < cost) return reject
  const next: GameState = { ...game, bounds: { ...game.bounds, plots: PLOTS.filter(p => game.bounds.plots!.includes(p) || p === plot) }, revision: game.revision + 1 }
  return isGameState(next) ? { ok: true, game: next, wallet: { ...wallet, gold: wallet.gold - cost } } : reject
}
