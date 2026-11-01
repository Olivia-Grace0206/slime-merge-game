import { describe, expect, it } from 'vitest'
import { MAX_TIER, type GameState, type MergePlan, type Slime } from '../../src/domain/game'
import { isGameState } from '../../src/core/board/state'
import { connectedSlimes, planDrop } from '../../src/core/merge/plan'
import { applyPlan } from '../../src/core/merge/apply'
import { cellKey } from '../../src/core/grid/coordinates'
import { createPreset, PRESETS } from '../../src/app/presets'

const slime = (id: string, x: number, y: number, tier = 1): Slime => ({
  id,
  tier,
  position: { x, y },
})
function board(
  slimes: readonly Slime[],
  highestTierReached = Math.max(1, ...slimes.map((s) => s.tier)),
): GameState {
  return {
    bounds: { origin: { x: 0, y: 0 }, width: 12, height: 12 },
    slimes,
    revision: 0,
    highestTierReached,
  }
}
function countBoard(n: number, tier = 1) {
  return board([
    slime('drag', 0, 11, tier),
    ...Array.from({ length: n - 1 }, (_, i) =>
      slime(`s${i}`, 2 + (i % 8), 1 + Math.floor(i / 8), tier),
    ),
  ])
}
const target = { x: 2, y: 1 }
function merge(state: GameState, drop = target): MergePlan {
  const p = planDrop(state, 'drag', drop)
  expect(p.kind).toBe('merge')
  if (p.kind !== 'merge') throw Error('Expected merge')
  return p
}
function ids() {
  let i = 0
  return () => `new-${++i}`
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    Object.values(value).forEach(freeze)
  }
  return value
}

describe('M01–M07 M16 M19 M20: five-first counts and atomic outputs', () => {
  it.each([
    [3, 1, 0],
    [4, 1, 1],
    [5, 2, 0],
    [6, 2, 1],
    [7, 2, 2],
    [8, 3, 0],
    [9, 3, 1],
    [10, 4, 0],
    [11, 4, 1],
    [13, 5, 0],
  ])('%i inputs -> %i outputs and %i remainder', (n, outputs, remainder) => {
    const state = freeze(countBoard(n)),
      p = merge(state),
      result = applyPlan(state, p, ids())
    expect(result.ok).toBe(true)
    expect(result.createdIds).toHaveLength(outputs)
    expect(result.state.slimes.filter((s) => s.tier === 1)).toHaveLength(remainder)
    expect(result.state.slimes.filter((s) => s.tier === 2)).toHaveLength(outputs)
    expect(result.state.slimes).toHaveLength(outputs + remainder)
    expect(isGameState(result.state)).toBe(true)
    for (const id of p.remainderIds)
      expect(result.state.slimes.find((s) => s.id === id)).toEqual(
        state.slimes.find((s) => s.id === id),
      )
  })
  it.each(Array.from({ length: 47 }, (_, i) => i + 3))(
    'conservation and unique occupied cells for %i candidates',
    (n) => {
      const state = countBoard(n),
        p = merge(state),
        out = applyPlan(state, p, ids())
      const consumed = p.groups.flatMap((g) => g.consumedIds),
        expectedOutput = 2 * Math.floor(n / 5) + Math.floor((n % 5) / 3)
      expect(new Set(consumed).size).toBe(consumed.length)
      expect(p.remainderIds.length).toBe((n % 5) % 3)
      expect(out.state.slimes.length).toBe(expectedOutput + p.remainderIds.length)
      expect(new Set(out.state.slimes.map((s) => cellKey(s.position))).size).toBe(
        out.state.slimes.length,
      )
    },
  )
})
describe('M08–M17: connected component and explicit drop rules', () => {
  it('M08: traverses diagonal beyond immediate neighbors', () => {
    const state = board([
      slime('drag', 0, 10),
      slime('a', 1, 1),
      slime('b', 2, 2),
      slime('c', 3, 3),
      slime('d', 4, 4),
    ])
    expect(connectedSlimes(state, 'drag', 'a').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(merge(state, { x: 1, y: 1 }).groups[0]?.consumedIds).toHaveLength(5)
  })
  it('M09: follows a bent path', () => {
    const state = board([
      slime('drag', 0, 10),
      ...[
        [1, 1],
        [2, 1],
        [3, 2],
        [3, 3],
        [4, 4],
        [5, 4],
      ].map(([x, y], i) => slime(`s${i}`, x!, y!)),
    ])
    expect(connectedSlimes(state, 'drag', 's0')).toHaveLength(6)
  })
  it('M10: different tiers do not bridge', () => {
    const state = board([
      slime('drag', 0, 9),
      slime('a', 1, 1),
      slime('bridge', 2, 1, 2),
      slime('b', 3, 1),
    ])
    expect(connectedSlimes(state, 'drag', 'a').map((s) => s.id)).toEqual(['a'])
    expect(planDrop(state, 'drag', { x: 1, y: 1 })).toMatchObject({ kind: 'swap', reason: 'too-few' })
  })
  it('M11 M12: adjacency and empty-cell movement never merge', () => {
    const state = countBoard(3),
      p = planDrop(state, 'drag', { x: 2, y: 2 })
    expect(state.slimes).toHaveLength(3)
    expect(p.kind).toBe('move')
    const out = applyPlan(state, p, ids())
    expect(out.state.slimes.map((s) => s.id)).toEqual(state.slimes.map((s) => s.id))
    expect(out.state.slimes.every((s) => s.tier === 1)).toBe(true)
  })
  it('M13: Phase3A exchanges different-tier occupied drop', () => {
    const state = board([slime('drag', 0, 0), slime('a', 1, 1, 2)])
    const p = planDrop(state, 'drag', { x: 1, y: 1 })
    expect(p).toMatchObject({ kind: 'swap', reason: 'different-tier' })
    expect(applyPlan(state, p, ids()).state.slimes.map(x => [x.id,x.tier])).toEqual(state.slimes.map(x => [x.id,x.tier]))
  })
  it('M14: two individuals never merge', () =>
    expect(planDrop(countBoard(2), 'drag', target)).toMatchObject({ kind: 'swap', reason: 'too-few' }))
  it('M15: source is counted once when originally adjacent', () => {
    const state = board([slime('drag', 1, 2), slime('a', 1, 1), slime('b', 2, 1)])
    expect(merge(state, { x: 1, y: 1 }).groups[0]?.consumedIds).toEqual(['drag', 'a', 'b'])
  })
  it('M15: removing source also removes its bridging path', () => {
    const state = board([slime('a', 1, 1), slime('drag', 2, 2), slime('b', 3, 3), slime('c', 4, 4)])
    expect(planDrop(state, 'drag', { x: 1, y: 1 })).toMatchObject({ kind: 'swap', reason: 'too-few' })
  })
  it('M17: generated tier does not automatically chain with adjacent upper tiers', () => {
    const state = board([
      ...countBoard(3).slimes,
      slime('upper1', 1, 1, 2),
      slime('upper2', 1, 2, 2),
    ])
    const out = applyPlan(state, merge(state), ids())
    expect(out.state.slimes).toHaveLength(3)
    expect(out.state.slimes.every((s) => s.tier === 2)).toBe(true)
  })
})
describe('M21 M22 M26–M32: one deterministic plan for preview and execution', () => {
  it('M26 M27: first group contains source+target+nearest three; y/x tie break', () => {
    const p = merge(countBoard(11))
    expect(p.groups.map((g) => g.consumedIds)).toEqual([
      ['drag', 's0', 's1', 's8', 's9'],
      ['s2', 's3', 's4', 's5', 's6'],
    ])
    expect(p.remainderIds).toEqual(['s7'])
  })
  it('M21 M28: repeated/reordered input preserves group numbers and IDs, no preview mutation', () => {
    const state = freeze(countBoard(13)),
      original = JSON.stringify(state),
      p = merge(state)
    for (let i = 0; i < 10; i++)
      expect(merge({ ...state, slimes: [...state.slimes].reverse() })).toEqual(p)
    expect(JSON.stringify(state)).toBe(original)
  })
  it('M22 M29 M32: consumed IDs, remainder and output cells exactly equal displayed plan', () => {
    const state = countBoard(11),
      p = freeze(merge(state)),
      result = applyPlan(state, p, ids())
    const consumed = new Set(p.groups.flatMap((g) => g.consumedIds))
    expect(
      state.slimes
        .filter((s) => !result.state.slimes.some((next) => next.id === s.id))
        .map((s) => s.id)
        .sort(),
    ).toEqual([...consumed].sort())
    expect(
      result.state.slimes.filter((s) => !result.createdIds.includes(s.id)).map((s) => s.id),
    ).toEqual(p.remainderIds)
    expect(
      result.state.slimes.filter((s) => result.createdIds.includes(s.id)).map((s) => s.position),
    ).toEqual(p.groups.flatMap((g) => g.outputs))
  })
  it('M23 M30: first output targets drop, subsequent outputs use their own consumed cells nearest first', () => {
    const state = countBoard(11),
      p = merge(state)
    expect(p.groups[0]?.outputs[0]).toEqual(target)
    expect(p.groups.map((g) => g.outputs)).toEqual([
      [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      [
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ],
    ])
    for (const g of p.groups)
      for (const output of g.outputs)
        expect(
          state.slimes.some(
            (s) => g.consumedIds.includes(s.id) && cellKey(s.position) === cellKey(output),
          ),
        ).toBe(true)
  })
  it('M31: does not require each selected group to be connected', () => {
    const cells = [
      [3, 3],
      [2, 2],
      [3, 2],
      [4, 2],
      [1, 1],
      [1, 2],
      [1, 3],
      [5, 1],
      [5, 2],
    ]
    const state = board([slime('drag', 0, 10), ...cells.map(([x, y], i) => slime(`s${i}`, x!, y!))])
    const p = merge(state, { x: 3, y: 3 }),
      g = p.groups[1]!
    const sub = board(state.slimes.filter((s) => g.consumedIds.includes(s.id)))
    expect(connectedSlimes(sub, '', g.consumedIds[0]!)).toHaveLength(3)
    expect(g.consumedIds).toHaveLength(5)
    expect(applyPlan(state, p, ids()).createdIds).toHaveLength(4)
  })
  it('can use drag origin as the second consumed output cell', () => {
    const state = board([
      slime('drag', 1, 0),
      slime('target', 1, 1),
      slime('a', 2, 1),
      slime('b', 3, 2),
      slime('c', 3, 3),
    ])
    expect(merge(state, { x: 1, y: 1 }).groups[0]?.outputs).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ])
  })
})
describe('atomic failures and stale/double commits', () => {
  it.each(['collision-old', 'collision-new', 'throws', 'blank'])(
    'rejects ID source failure %s without partial changes',
    (mode) => {
      const state = freeze(countBoard(11)),
        p = merge(state)
      const generator = () => {
        if (mode === 'throws') throw Error('failure')
        return mode === 'blank' ? '' : mode === 'collision-old' ? 'drag' : 'duplicate'
      }
      const result = applyPlan(state, p, generator)
      expect(result.ok).toBe(false)
      expect(result.state).toBe(state)
      expect(result.createdIds).toEqual([])
    },
  )
  it('M18: refuses repeated merge plan after a successful commit', () => {
    const state = countBoard(5),
      p = merge(state),
      result = applyPlan(state, p, ids())
    expect(result.ok).toBe(true)
    expect(applyPlan(result.state, p, ids()).ok).toBe(false)
  })
  it('refuses stale plans even when revision was not updated', () => {
    const state = countBoard(5),
      p = merge(state),
      changed = { ...state, highestTierReached: 8 }
    expect(applyPlan(changed, p, ids()).state).toBe(changed)
  })
  it('rejects overlapping/tampered output positions', () => {
    const state = countBoard(5),
      p = merge(state),
      bad = { ...p, groups: [{ ...p.groups[0]!, outputs: [target, target] }] }
    expect(applyPlan(state, bad, ids()).state).toBe(state)
  })
  it('rejects duplicate consumption IDs', () => {
    const state = countBoard(5),
      p = merge(state),
      bad = { ...p, groups: [{ ...p.groups[0]!, consumedIds: ['drag', 's0', 's1', 's2', 's2'] }] }
    expect(applyPlan(state, bad, ids()).ok).toBe(false)
  })
  it.each([
    { x: -1, y: 0 },
    { x: 12, y: 0 },
    { x: 0.5, y: 0 },
    { x: NaN, y: 0 },
  ])('rejects outside or invalid target %j', (position) => {
    const state = countBoard(3),
      p = planDrop(state, 'drag', position)
    expect(p).toEqual({ kind: 'invalid', reason: 'outside-board' })
    expect(applyPlan(state, p, ids()).state.slimes.map(x => [x.id,x.tier])).toEqual(state.slimes.map(x => [x.id,x.tier]))
  })
  it('source self drop and unknown source do not modify state', () => {
    const state = countBoard(3)
    expect(planDrop(state, 'drag', { x: 0, y: 11 }).kind).toBe('invalid')
    expect(planDrop(state, 'unknown', target).kind).toBe('invalid')
  })
})
describe('M33–M35: tier cap and historical maximum', () => {
  it.each(Array.from({ length: MAX_TIER - 1 }, (_, i) => i + 1))(
    'merges Tier %i into the next tier',
    (tier) => {
      const state = countBoard(3, tier),
        p = merge(state),
        result = applyPlan(state, p, ids())
      expect(result.state.slimes[0]?.tier).toBe(tier + 1)
      expect(result.state.highestTierReached).toBe(tier + 1)
    },
  )
  it('M34: cap exchanges positions and consumes nothing', () => {
    const state = countBoard(5, MAX_TIER),
      p = planDrop(state, 'drag', target)
    expect(p).toMatchObject({ kind: 'swap', reason: 'max-tier' })
    expect(applyPlan(state, p, ids()).state.slimes.map(x => [x.id,x.tier])).toEqual(state.slimes.map(x => [x.id,x.tier]))
  })
  it('M35: moving and lower-tier consumption do not decrease historical record', () => {
    const state = { ...countBoard(5), highestTierReached: MAX_TIER }
    const moved = applyPlan(state, planDrop(state, 'drag', { x: 0, y: 10 }), ids()).state
    expect(moved.highestTierReached).toBe(MAX_TIER)
    expect(applyPlan(moved, merge(moved), ids()).state.highestTierReached).toBe(MAX_TIER)
  })
  it.each(PRESETS)('valid preset $id initializes explicit historical record', (p) => {
    const state = createPreset(p.id)
    expect(isGameState(state)).toBe(true)
    expect(state.highestTierReached).toBe(p.id === 'high' ? MAX_TIER : 1)
  })
})

it('250 seeded mixed-tier layouts agree with an independent fixed-point connectivity oracle', () => {
  let randomState = 137
  const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 2 ** 32 }
  for (let sample = 0; sample < 250; sample++) {
    const slimes: Slime[] = []
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      if (random() < 0.7) slimes.push(slime(`s-${x}-${y}`, x, y, random() < 0.7 ? 1 : 2))
    }
    if (slimes.length < 2) continue
    const source = slimes[Math.floor(random() * slimes.length)]!
    const destination = slimes.find(s => s.id !== source.id && s.tier === source.tier)
    if (!destination) continue
    const state = freeze(board(slimes)), reached = new Set([destination.id])
    let changed = true
    while (changed) {
      changed = false
      for (const candidate of slimes) {
        if (candidate.id === source.id || candidate.tier !== source.tier || reached.has(candidate.id)) continue
        if (slimes.some(s => reached.has(s.id) && Math.abs(s.position.x - candidate.position.x) <= 1 && Math.abs(s.position.y - candidate.position.y) <= 1)) {
          reached.add(candidate.id); changed = true
        }
      }
    }
    const p = planDrop(state, source.id, destination.position)
    const total = reached.size + 1
    if (total < 3) { expect(p.kind).toBe('swap'); continue }
    expect(p.kind).toBe('merge')
    if (p.kind !== 'merge') throw Error('oracle expected merge')
    const result = applyPlan(state, freeze(p), ids())
    expect(result.ok).toBe(true)
    expect(isGameState(result.state)).toBe(true)
    const expectedOutputs = 2 * Math.floor(total / 5) + Math.floor(total % 5 / 3)
    const expectedConsumed = 5 * Math.floor(total / 5) + 3 * Math.floor(total % 5 / 3)
    expect(result.createdIds).toHaveLength(expectedOutputs)
    expect(result.state.slimes).toHaveLength(state.slimes.length - expectedConsumed + expectedOutputs)
    const consumed = new Set(p.groups.flatMap(g => g.consumedIds))
    for (const old of state.slimes.filter(s => !consumed.has(s.id))) expect(result.state.slimes.find(s => s.id === old.id)).toEqual(old)
  }
})
it('M33/M36: 29→30, 30→31 and 39→40 work for both 3- and 5-body groups', () => {
  for (const tier of [29, 30, 39]) for (const count of [3, 5]) {
    const state = countBoard(count, tier), result = applyPlan(state, merge(state), ids())
    expect(result.ok).toBe(true)
    expect(result.state.slimes).toHaveLength(count === 3 ? 1 : 2)
    expect(result.state.slimes.every(s => s.tier === tier + 1)).toBe(true)
    expect(result.state.highestTierReached).toBe(tier + 1)
  }
})
it('high preset explicitly contains Tier39 candidates and Tier40 capped individuals', () => {
  const state = createPreset('high')
  expect(state.slimes.filter(s => s.tier === 39)).toHaveLength(3)
  expect(state.slimes.filter(s => s.tier === 40)).toHaveLength(3)
  expect(applyPlan(state, planDrop(state, 'cap-0', {x:3,y:5}), ids()).state.slimes.find(x => x.id === 'cap-0')?.position).toEqual({x:3,y:5})
  expect(isGameState({...state, highestTierReached:41})).toBe(false)
})

