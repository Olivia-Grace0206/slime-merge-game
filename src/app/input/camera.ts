import type { Point } from '../../core/input/coordinates'

export type Camera = Readonly<{ center: Point; zoom: number }>
export type View = Readonly<{ width: number; height: number; fit: number }>
export const WORLD_SIZE = 700
export const MIN_ZOOM = 0.75
export const MAX_ZOOM = 3
export const initialCamera = (): Camera => ({ center: { x: 350, y: 350 }, zoom: 1 })
export function fitView(width: number, height: number): View {
  return { width, height, fit: Math.max(1, Math.min(width, height) - 8) / WORLD_SIZE }
}
export function worldToScreen(p: Point, camera: Camera, view: View): Point {
  const scale = camera.zoom * view.fit
  return { x: view.width / 2 + (p.x - camera.center.x) * scale,
    y: view.height / 2 + (p.y - camera.center.y) * scale }
}
export function screenToWorld(p: Point, camera: Camera, view: View): Point {
  const scale = camera.zoom * view.fit
  return { x: camera.center.x + (p.x - view.width / 2) / scale,
    y: camera.center.y + (p.y - view.height / 2) / scale }
}
/** Keep at least one world cell reachable; bounds scale with the viewport and zoom. */
export function constrainCamera(camera: Camera, view: View): Camera {
  const halfX = view.width / (2 * view.fit * camera.zoom)
  const halfY = view.height / (2 * view.fit * camera.zoom)
  const clamp = (v: number, half: number) => Math.max(100 - half, Math.min(600 + half, v))
  return { ...camera, center: { x: clamp(camera.center.x, halfX), y: clamp(camera.center.y, halfY) } }
}
/** The world point at `from` follows `to`; handles zoom and moving pinch midpoints together. */
export function zoomAt(camera: Camera, view: View, from: Point, zoom: number, to = from): Camera {
  const boundedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
  const anchor = screenToWorld(from, camera, view)
  const scale = boundedZoom * view.fit
  return constrainCamera({ zoom: boundedZoom, center: {
    x: anchor.x - (to.x - view.width / 2) / scale,
    y: anchor.y - (to.y - view.height / 2) / scale,
  } }, view)
}
export function panCamera(camera: Camera, view: View, start: Point, current: Point): Camera {
  const scale = camera.zoom * view.fit
  return constrainCamera({ ...camera, center: {
    x: camera.center.x - (current.x - start.x) / scale,
    y: camera.center.y - (current.y - start.y) / scale,
  } }, view)
}
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
