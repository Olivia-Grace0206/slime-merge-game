import type { GridPosition } from './grid'

export const MAX_TIER = 40
export function isTier(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_TIER
}
export type Slime = Readonly<{ id: string; tier: number; position: GridPosition }>
export type BoardBounds = Readonly<{ origin: GridPosition; width: number; height: number }>
export type GameState = Readonly<{
  bounds: BoardBounds
  slimes: readonly Slime[]
  highestTierReached: number
  revision: number
}>
export type MergeGroup = Readonly<{
  number: number
  consumedIds: readonly string[]
  outputs: readonly GridPosition[]
}>
export type InvalidReason =
  | 'invalid-state'
  | 'missing-source'
  | 'outside-board'
  | 'same-cell'
  | 'different-tier'
  | 'too-few'
  | 'max-tier'
  | 'research-locked'
type PlanBase = Readonly<{ sourceId: string; target: GridPosition; snapshot: string }>
export type MovePlan = PlanBase & Readonly<{ kind: 'move' }>
export type MergePlan = PlanBase &
  Readonly<{
    kind: 'merge'
    outputTier: number
    groups: readonly MergeGroup[]
    remainderIds: readonly string[]
  }>
export type DropPlan = MovePlan | MergePlan | Readonly<{ kind: 'invalid'; reason: InvalidReason }>
