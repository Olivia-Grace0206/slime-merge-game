import { isAttributes } from '../../domain/attributes'
import { isTier, type BoardBounds, type GameState } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { cellKey, isGridPosition } from '../grid/coordinates'

export function inBounds(bounds: BoardBounds, p: GridPosition): boolean {
  return (
    isGridPosition(p) &&
    p.x >= bounds.origin.x &&
    p.y >= bounds.origin.y &&
    p.x - bounds.origin.x < bounds.width &&
    p.y - bounds.origin.y < bounds.height &&
    (!bounds.plots || bounds.plots.includes((['A','B','C','D'] as const)[(p.y >= 4 ? 2 : 0) + (p.x >= 4 ? 1 : 0)]!))
  )
}
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const s = value as GameState
  const b = s.bounds
  if (
    !b ||
    !isGridPosition(b.origin) ||
    !Number.isSafeInteger(b.width) ||
    b.width < 1 ||
    !Number.isSafeInteger(b.height) ||
    b.height < 1 ||
    !Number.isSafeInteger(b.origin.x + b.width - 1) ||
    !Number.isSafeInteger(b.origin.y + b.height - 1) ||
    !Array.isArray(s.slimes) ||
    !isTier(s.highestTierReached) ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    s.revision >= Number.MAX_SAFE_INTEGER
  )
    return false
  if (b.plots !== undefined && (!Array.isArray(b.plots) || b.width !== 8 || b.height !== 8 || b.origin.x !== 0 || b.origin.y !== 0 ||
    !b.plots.includes('A') || new Set(b.plots).size !== b.plots.length || b.plots.some(p => !['A','B','C','D'].includes(p)) ||
    (b.plots.includes('D') && (!b.plots.includes('B') || !b.plots.includes('C'))))) return false
  const ids = new Set<string>(),
    cells = new Set<string>()
  for (const slime of s.slimes) {
    if (
      !slime ||
      typeof slime.id !== 'string' ||
      !slime.id.trim() ||
      ids.has(slime.id) ||
      !isTier(slime.tier) ||
      (slime.attributes !== undefined && !isAttributes(slime.attributes)) ||
      slime.tier > s.highestTierReached ||
      !inBounds(b, slime.position)
    )
      return false
    const key = cellKey(slime.position)
    if (cells.has(key)) return false
    ids.add(slime.id)
    cells.add(key)
  }
  return true
}
/** Full value snapshot detects stale plans, including resets and non-revision changes. */
export function stateSnapshot(state: GameState): string {
  return JSON.stringify([
    state.bounds,
    state.highestTierReached,
    state.revision,
    [...state.slimes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((s) => [s.id, s.tier, s.position.x, s.position.y, s.attributes ?? []]),
  ])
}

