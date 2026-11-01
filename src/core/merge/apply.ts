import { withAwakenings } from '../attributes/awakening'
import { geneticsForGroup } from '../attributes/effects'
import { randomUnit, mutateAttributes } from '../attributes/inheritance'
import { MAX_TIER, isTier, type DropPlan, type GameState, type Slime } from '../../domain/game'
import { isGameState, stateSnapshot } from '../board/state'
import { cellKey } from '../grid/coordinates'
import { compareNear, splitCount, planDrop } from './plan'

export type ApplyResult = Readonly<{ ok: boolean; state: GameState; createdIds: readonly string[] }>
/** Applies the displayed plan itself. No candidate re-selection during commit. */
export function applyPlan(state: GameState, plan: DropPlan, nextId: () => string, researchMaxTier = MAX_TIER, random?: () => number, mutationChance?: number): ApplyResult {
  const reject = (): ApplyResult => ({ ok: false, state, createdIds: [] })
  if (plan.kind === 'invalid' || !isGameState(state) || plan.snapshot !== stateSnapshot(state))
    return reject()
  try {
    const source = state.slimes.find((s) => s.id === plan.sourceId)
    if (!source) return reject()
    // Revalidate canonical intent, including merge priority and every consumed ID.
    if (JSON.stringify(plan) !== JSON.stringify(planDrop(state, plan.sourceId, plan.target, researchMaxTier))) return reject()
    let slimes: readonly Slime[]
    const createdIds: string[] = []
    if (plan.kind === 'move') {
      slimes = state.slimes.map((s) =>
        s.id === plan.sourceId ? { ...s, position: { ...plan.target } } : s,
      )
    } else if (plan.kind === 'swap') {
      slimes = state.slimes.map(s => s.id === source.id ? { ...s, position: { ...plan.target } }
        : s.id === plan.targetId ? { ...s, position: { ...plan.sourcePosition } } : s)
    } else {
      if (!isTier(researchMaxTier) || plan.outputTier > researchMaxTier) return reject()
      const target = state.slimes.find((s) => cellKey(s.position) === cellKey(plan.target))
      const consumed = plan.groups.flatMap((g) => g.consumedIds)
      const consumedSet = new Set(consumed)
      const remainderSet = new Set(plan.remainderIds)
      const sizes = splitCount(consumed.length + plan.remainderIds.length)
      if (
        !target ||
        target.id === source.id ||
        target.tier !== source.tier ||
        plan.outputTier !== source.tier + 1 ||
        sizes.length !== plan.groups.length ||
        consumedSet.size !== consumed.length ||
        remainderSet.size !== plan.remainderIds.length ||
        plan.remainderIds.some(
          (id) => consumedSet.has(id) || !state.slimes.some((s) => s.id === id),
        ) ||
        !plan.groups[0]?.consumedIds.includes(source.id) ||
        !plan.groups[0]?.consumedIds.includes(target.id)
      )
        return reject()
      const outputs: Slime[] = [],
        ids = new Set(state.slimes.map((s) => s.id))
      for (const [i, group] of plan.groups.entries()) {
        const members = group.consumedIds.map((id) => state.slimes.find((s) => s.id === id))
        if (
          group.number !== i + 1 ||
          group.consumedIds.length !== sizes[i] ||
          members.some((s) => !s || s.tier !== source.tier)
        )
          return reject()
        const expected = members
          .map((s) => s!.position)
          .sort((a, b) => compareNear(plan.target, a, b))
          .slice(0, sizes[i] === 5 ? 2 : 1)
        if (JSON.stringify(group.outputs) !== JSON.stringify(expected)) return reject()
        const genetics = geneticsForGroup(state, group.consumedIds)
        let attributes = random ? mutateAttributes(group.attributes ?? [], random, mutationChance ?? genetics.mutationChance) : group.attributes
        // Shared per group, after mutation; only inherited dark is exposed to loss.
        if (random && genetics.darkLossChance > 0 && randomUnit(random) < genetics.darkLossChance)
          attributes = attributes?.filter(a => a.id !== 'dark')
        for (const [outputIndex,position] of group.outputs.entries()) {
          const id = nextId()
          // Reject even reuse of consumed IDs, so a stale drag can never target an output.
          if (typeof id !== 'string' || !id.trim() || ids.has(id)) return reject()
          ids.add(id)
          createdIds.push(id)
          outputs.push({ id, tier: plan.outputTier, position: { ...position }, ...(attributes !== undefined ? { attributes: withAwakenings(attributes,group.awakening?.outputs[outputIndex]??[]) } : {}) })
        }
      }
      slimes = [...state.slimes.filter((s) => !consumedSet.has(s.id)), ...outputs]
    }
    const next = {
      ...state,
      slimes,
      revision: state.revision + 1,
      highestTierReached: Math.max(state.highestTierReached, ...slimes.map((s) => s.tier)),
    }
    if (!isGameState(next)) return reject()
    return { ok: true, state: next, createdIds }
  } catch {
    return reject()
  }
}

