import { MAX_TIER, type DropPlan, type GameState, type MergeGroup, type Slime } from '../../domain/game'
import type { GridPosition } from '../../domain/grid'
import { cellKey, samePosition } from '../grid/coordinates'
import { inBounds, isGameState, stateSnapshot } from '../board/state'

/** Provisional: Chebyshev distance, then y ascending, then x ascending. */
export function compareNear(target: GridPosition, a: GridPosition, b: GridPosition): number {
  const distance = (p: GridPosition) => Math.max(Math.abs(p.x - target.x), Math.abs(p.y - target.y))
  return distance(a) - distance(b) || a.y - b.y || a.x - b.x
}
/** Drag source is removed BEFORE traversal, so its original cell cannot bridge clusters. */
export function connectedSlimes(state: GameState, sourceId: string, targetId: string): readonly Slime[] {
  const target = state.slimes.find(s => s.id === targetId && s.id !== sourceId)
  if (!target) return []
  const cells = new Map(state.slimes.filter(s => s.id !== sourceId && s.tier === target.tier).map(s => [cellKey(s.position), s]))
  const queue = [target], visited = new Set([target.id])
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const x = current.position.x + dx, y = current.position.y + dy
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) continue
      const next = cells.get(cellKey({ x, y }))
      if (next && !visited.has(next.id)) { visited.add(next.id); queue.push(next) }
    }
  }
  return queue
}
export function splitCount(count: number): readonly (3 | 5)[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid count')
  const groups: (3 | 5)[] = []
  while (count >= 5) { groups.push(5); count -= 5 }
  while (count >= 3) { groups.push(3); count -= 3 }
  return groups
}
/** Pure planning only: no IDs, randomness, mutation, DOM or React. */
export function planDrop(state: GameState, sourceId: string, target: GridPosition): DropPlan {
  if (!isGameState(state)) return { kind: 'invalid', reason: 'invalid-state' }
  const source = state.slimes.find(s => s.id === sourceId)
  if (!source) return { kind: 'invalid', reason: 'missing-source' }
  if (!inBounds(state.bounds, target)) return { kind: 'invalid', reason: 'outside-board' }
  if (samePosition(source.position, target)) return { kind: 'invalid', reason: 'same-cell' }
  const base = { sourceId, target: { ...target }, snapshot: stateSnapshot(state) }
  const destination = state.slimes.find(s => samePosition(s.position, target))
  if (!destination) return { ...base, kind: 'move' }
  if (destination.tier !== source.tier) return { kind: 'invalid', reason: 'different-tier' }
  if (source.tier >= MAX_TIER) return { kind: 'invalid', reason: 'max-tier' }
  const connected = connectedSlimes(state, sourceId, destination.id)
  const sizes = splitCount(connected.length + 1)
  if (!sizes.length) return { kind: 'invalid', reason: 'too-few' }
  const ordered = [source, destination, ...connected.filter(s => s.id !== destination.id)
    .sort((a, b) => compareNear(target, a.position, b.position))]
  const groups: MergeGroup[] = []
  let cursor = 0
  for (const size of sizes) {
    const members = ordered.slice(cursor, cursor + size)
    cursor += size
    const cells = members.map(s => s.position).sort((a, b) => compareNear(target, a, b))
    // Target is uniquely distance zero in the first group, hence always first.
    groups.push({ number: groups.length + 1, consumedIds: members.map(s => s.id),
      outputs: cells.slice(0, size === 5 ? 2 : 1).map(p => ({ ...p })) })
  }
  return { ...base, kind: 'merge', outputTier: source.tier + 1, groups, remainderIds: ordered.slice(cursor).map(s => s.id) }
}
