import type { Attributes, AwakeningAllocation } from './attributes'
import type { GridPosition } from './grid'

export const MAX_TIER = 40
export function isTier(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_TIER
}
export type Slime = Readonly<{ id: string; tier: number; position: GridPosition; attributes?: Attributes }>
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
  attributes?: Attributes
  awakening?: AwakeningAllocation
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
export type SwapReason = 'different-tier' | 'too-few' | 'max-tier' | 'research-locked' | 'attribute-limit'
export type SwapPlan = PlanBase & Readonly<{ kind: 'swap'; targetId: string; sourcePosition: GridPosition; reason: SwapReason }>
export type MovePlan = PlanBase & Readonly<{ kind: 'move' }>
export type MergePlan = PlanBase &
  Readonly<{
    kind: 'merge'
    outputTier: number
    groups: readonly MergeGroup[]
    remainderIds: readonly string[]
  }>
export type DropPlan = MovePlan | SwapPlan | MergePlan | Readonly<{ kind: 'invalid'; reason: InvalidReason }>

