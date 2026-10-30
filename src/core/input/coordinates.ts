import type { GridPosition } from '../../domain/grid'
export type Point = Readonly<{ x: number; y: number }>
/** The caller supplies the transformed board rectangle; camera math stays outside game rules. */
export function screenToCell(
  point: Point,
  board: Point,
  cellSize: number,
  origin: GridPosition,
): GridPosition {
  return {
    x: origin.x + Math.floor((point.x - board.x) / cellSize),
    y: origin.y + Math.floor((point.y - board.y) / cellSize),
  }
}
export function panOffset(start: Point, current: Point, camera: Point, limit: number): Point {
  const clamp = (n: number) => Math.max(-limit, Math.min(limit, n))
  return { x: clamp(camera.x + current.x - start.x), y: clamp(camera.y + current.y - start.y) }
}
