import { describe, expect, it } from 'vitest'
import { cellKey, isGridPosition, samePosition } from '../../src/core/grid/coordinates'

describe('isGridPosition', () => {
  it.each([
    { x: 0, y: 0 },
    { x: -2, y: 4 },
    { x: Number.MAX_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER },
  ])('accepts safe integer coordinates: %j', (position) => {
    expect(isGridPosition(position)).toBe(true)
  })

  it.each([
    null,
    undefined,
    [],
    '0,0',
    {},
    { x: 0 },
    { y: 0 },
    { x: '0', y: 0 },
    { x: 0, y: '0' },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: NaN, y: 0 },
    { x: 0, y: Infinity },
    { x: -Infinity, y: 0 },
    { x: Number.MAX_SAFE_INTEGER + 1, y: 0 },
    { x: 0, y: Number.MIN_SAFE_INTEGER - 1 },
  ])('rejects invalid coordinates: %j', (value) => {
    expect(isGridPosition(value)).toBe(false)
  })
})

describe('samePosition', () => {
  it('compares coordinates by value without mutating frozen inputs', () => {
    const a = Object.freeze({ x: -2, y: 3 })
    const b = Object.freeze({ x: -2, y: 3 })
    expect(samePosition(a, b)).toBe(true)
  })

  it.each([{ x: 3, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 3 }])(
    'distinguishes a different cell %j from (2,3)', (position) => {
      expect(samePosition({ x: 2, y: 3 }, position)).toBe(false)
    },
  )
})

describe('cellKey', () => {
  it('preserves coordinate order and signs without key collisions', () => {
    const positions = [{ x: 1, y: 23 }, { x: 12, y: 3 }, { x: 23, y: 1 }, { x: -1, y: 23 }]
    expect(positions.map(cellKey)).toEqual(['1,23', '12,3', '23,1', '-1,23'])
    expect(new Set(positions.map(cellKey)).size).toBe(positions.length)
  })

  it('treats positive and negative zero as the same cell', () => {
    expect(cellKey({ x: -0, y: 0 })).toBe(cellKey({ x: 0, y: -0 }))
  })

  it('accepts the safe integer boundaries', () => {
    expect(cellKey({ x: Number.MIN_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER }))
      .toBe('-9007199254740991,9007199254740991')
  })

  it.each([{ x: 0.1, y: 0 }, { x: 0, y: Infinity }, { x: Number.MAX_SAFE_INTEGER + 1, y: 0 }])(
    'rejects invalid input rather than generating a cell key: %j', (position) => {
      expect(() => cellKey(position)).toThrow(RangeError)
    },
  )
})
