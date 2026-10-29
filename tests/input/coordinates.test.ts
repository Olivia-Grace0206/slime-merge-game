import { expect, it } from 'vitest'
import { screenToCell, panOffset } from '../../src/core/input/coordinates'
it.each([
  [100, 200, 0, 0],
  [149, 249, 0, 0],
  [150, 250, 1, 1],
  [99, 199, -1, -1],
])('converts (%s,%s) to (%s,%s)', (x, y, cx, cy) => {
  expect(screenToCell({ x, y }, { x: 100, y: 200 }, 50, { x: 0, y: 0 })).toEqual({ x: cx, y: cy })
})
it('supports panned camera and signed world origin', () =>
  expect(screenToCell({ x: 200, y: 200 }, { x: 150, y: 100 }, 25, { x: -10, y: -10 })).toEqual({
    x: -8,
    y: -6,
  }))
it('pan clamps both axes so small test board remains recoverable', () =>
  expect(panOffset({ x: 0, y: 0 }, { x: 800, y: -800 }, { x: 10, y: 20 }, 100)).toEqual({
    x: 100,
    y: -100,
  }))
