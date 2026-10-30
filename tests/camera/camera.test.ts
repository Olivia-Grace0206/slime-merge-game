import { expect, it } from 'vitest'
import { fitView, initialCamera, worldToScreen, screenToWorld, zoomAt, panCamera, MAX_ZOOM, MIN_ZOOM } from '../../src/app/input/camera'
const sizes = [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]
it.each(sizes)('fit, roundtrip and anchored zoom %ix%i', (width, height) => {
  const view = fitView(width!, height!), camera = initialCamera()
  const tl = worldToScreen({ x: 0, y: 0 }, camera, view), br = worldToScreen({ x: 700, y: 700 }, camera, view)
  expect(tl.x).toBeGreaterThanOrEqual(3.9); expect(tl.y).toBeGreaterThanOrEqual(3.9)
  expect(br.x).toBeLessThanOrEqual(width! - 3.9); expect(br.y).toBeLessThanOrEqual(height! - 3.9)
  const anchor = { x: width! * .43, y: height! * .54 }
  const world = screenToWorld(anchor, camera, view)
  const zoomed = zoomAt(camera, view, anchor, 2)
  expect(worldToScreen(world, zoomed, view).x).toBeCloseTo(anchor.x, 8)
  expect(worldToScreen(world, zoomed, view).y).toBeCloseTo(anchor.y, 8)
  for (const zoom of [.75, 1, 2, 3]) {
    const panned = panCamera({ ...camera, zoom }, view, { x: 50, y: 60 }, { x: 100, y: 90 })
    const point = { x: 215, y: 375 }
    const back = screenToWorld(worldToScreen(point, panned, view), panned, view)
    expect(back.x).toBeCloseTo(point.x, 9); expect(back.y).toBeCloseTo(point.y, 9)
  }
})
it('zoom clamps and a moving pinch midpoint follows the same world anchor', () => {
  const view = fitView(900, 700), camera = initialCamera(), from = {x:400,y:300}, to={x:430,y:330}
  const anchor = screenToWorld(from, camera, view)
  const next = zoomAt(camera, view, from, 1.8, to)
  expect(worldToScreen(anchor, next, view).x).toBeCloseTo(to.x, 8)
  expect(worldToScreen(anchor, next, view).y).toBeCloseTo(to.y, 8)
  expect(zoomAt(camera, view, from, 20).zoom).toBe(MAX_ZOOM)
  expect(zoomAt(camera, view, from, .01).zoom).toBe(MIN_ZOOM)
})
it('camera pan cannot lose the entire board', () => {
  const view = fitView(700, 700), camera = panCamera(initialCamera(), view, {x:0,y:0}, {x:1e6,y:-1e6})
  const tl = worldToScreen({x:0,y:0}, camera, view), br=worldToScreen({x:700,y:700},camera,view)
  expect(tl.x).toBeLessThan(view.width); expect(br.y).toBeGreaterThan(0)
})
