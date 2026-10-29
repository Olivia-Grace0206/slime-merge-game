import type { GridPosition } from '../../domain/grid'

/** Runtime validation for external data. Board bounds are a separate concern. */
export function isGridPosition(value: unknown): value is GridPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'x' in value &&
    'y' in value &&
    Number.isSafeInteger(value.x) &&
    Number.isSafeInteger(value.y)
  )
}

/** Value equality; never compares object identity or changes the inputs. */
export function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y
}

/** An unambiguous cell key. Reject invalid input instead of aliasing cells. */
export function cellKey(position: GridPosition): string {
  if (!isGridPosition(position)) {
    throw new RangeError('Cell coordinates must be safe integers.')
  }
  return `${position.x},${position.y}`
}
