import { expect, it } from 'vitest'
import { isGameState } from '../../src/core/board/state'
import { createPreset } from '../../src/app/presets'
import { planDrop, splitCount } from '../../src/core/merge/plan'
const valid = createPreset('five')
it.each([
  null,
  {},
  [],
  { ...valid, highestTierReached: 0 },
  { ...valid, highestTierReached: 31 },
  { ...valid, highestTierReached: 1.5 },
  { ...valid, revision: -1 },
  { ...valid, revision: Infinity },
  { ...valid, bounds: { ...valid.bounds, width: 0 } },
  { ...valid, bounds: { ...valid.bounds, origin: { x: Number.MAX_SAFE_INTEGER, y: 0 } } },
  { ...valid, slimes: [valid.slimes[0], valid.slimes[0]] },
  { ...valid, slimes: [{ ...valid.slimes[0], tier: NaN }] },
  { ...valid, slimes: [{ ...valid.slimes[0], tier: 2 }] },
  { ...valid, slimes: [{ ...valid.slimes[0], position: { x: -1, y: 0 } }] },
  { ...valid, slimes: [{ ...valid.slimes[0], id: '' }] },
  { ...valid, slimes: [{ ...valid.slimes[0], position: null }] },
])('rejects malformed state %j', (state) => expect(isGameState(state)).toBe(false))
it('signed origin supports future expansion without changing coordinate API', () => {
  const state = { ...valid, bounds: { origin: { x: -7, y: -7 }, width: 14, height: 14 } }
  expect(isGameState(state)).toBe(true)
  expect(planDrop(state, 'drag', { x: -2, y: -3 }).kind).toBe('move')
})
it.each([-1, NaN, 2.1, Infinity])('splitCount rejects %s', (n) =>
  expect(() => splitCount(n)).toThrow(RangeError),
)
