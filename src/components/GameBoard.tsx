import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent,
} from 'react'
import { MAX_TIER, type DropPlan, type InvalidReason } from '../domain/game'
import type { GridPosition } from '../domain/grid'
import { samePosition } from '../core/grid/coordinates'
import { applyPlan } from '../core/merge/apply'
import { planDrop } from '../core/merge/plan'
import { screenToCell, type Point } from '../core/input/coordinates'
import {
  distance, fitView, initialCamera, midpoint, panCamera, screenToWorld, worldToScreen, zoomAt,
  type Camera, type View,
} from '../app/input/camera'
import { idleGesture, transition, type GestureState } from '../app/input/gestures'
import { createPreset, type PresetId } from '../app/presets'
import { Slime } from './Slime'
import { GameMenu, type Panel } from './GameMenu'

const GROUP_COLORS = ['#e58522', '#1b9db7', '#9460ce', '#df6392', '#71992c', '#5970d1', '#a46a49', '#b9871f', '#427e89', '#a85b9a']
const REASONS: Record<InvalidReason, string> = {
  'invalid-state': '盤面を確認できません。リセットしてください',
  'missing-source': '操作を取り消しました',
  'outside-board': '盤面外のため取り消しました',
  'same-cell': '同じTierへ重ねてドロップ',
  'different-tier': 'Tierが異なります',
  'too-few': '対象が足りません（3体以上必要）',
  'max-tier': `Tier ${MAX_TIER}は上限です（消費なし）`,
}
export function GameBoard() {
  const [game, setGame] = useState(() => createPreset('five'))
  const gameRef = useRef(game)
  const [preset, setPreset] = useState<PresetId>('five')
  const [camera, setCamera] = useState(initialCamera)
  const cameraRef = useRef(camera)
  const [view, setView] = useState<View>(() => fitView(1, 1))
  const viewRef = useRef(view)
  const [gesture, setGesture] = useState<GestureState>(idleGesture)
  const active = useRef(gesture)
  const [preview, setPreview] = useState<DropPlan | null>(null)
  const previewRef = useRef<{ target: GridPosition; plan: DropPlan } | null>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('同じTierへ重ねてドロップ')
  const [createdIds, setCreatedIds] = useState<readonly string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [reducedEffects, setReducedEffects] = useState(false)
  const idSequence = useRef(0)

  const changeCamera = useCallback((next: Camera) => {
    cameraRef.current = next
    setCamera(next)
  }, [])
  const clearPreview = useCallback(() => {
    previewRef.current = null
    setPreview(null)
    setSelected(null)
  }, [])
  const abort = useCallback((clearContacts = false) => {
    const contacts = active.current.contacts
    active.current = clearContacts ? idleGesture() : transition(active.current, { type: 'cancel' }).state
    setGesture(active.current)
    clearPreview()
    if (clearContacts) for (const c of contacts) {
      if (viewport.current?.hasPointerCapture(c.id)) viewport.current.releasePointerCapture(c.id)
    }
  }, [clearPreview])

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]!.contentRect
      // A changed fit invalidates gesture baselines. Refit on rotation/browser chrome changes.
      abort(true)
      const next = fitView(rect.width, rect.height)
      viewRef.current = next
      setView(next)
      changeCamera(initialCamera())
    })
    observer.observe(element)
    const blur = () => { abort(true) }
    const visibility = () => { if (document.hidden) abort(true) }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { abort(); setMessage('操作を取り消しました') }
    }
    // Native, non-passive listener: prevent browser/page zoom only inside the game viewport.
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (active.current.contacts.length) return
      clearPreview()
      const rect = element.getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1)
      changeCamera(zoomAt(cameraRef.current, viewRef.current, point, cameraRef.current.zoom * Math.exp(-delta * 0.0015)))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('keydown', escape)
    return () => {
      observer.disconnect()
      element.removeEventListener('wheel', wheel)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('keydown', escape)
    }
  }, [abort, changeCamera, clearPreview])

  function localPoint(e: { clientX: number; clientY: number }): Point {
    const rect = viewport.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function targetAt(point: Point): GridPosition | null {
    const v = viewRef.current
    if (point.x < 0 || point.x >= v.width || point.y < 0 || point.y >= v.height) return null
    const p = screenToWorld(point, cameraRef.current, v)
    if (p.x < 0 || p.x >= 700 || p.y < 0 || p.y >= 700) return null
    return screenToCell(p, { x: 0, y: 0 }, 100, gameRef.current.bounds.origin)
  }
  function planAt(sourceId: string, point: Point): DropPlan | null {
    const target = targetAt(point)
    if (!target) return null
    const previous = previewRef.current
    if (previous && samePosition(previous.target, target)) return previous.plan
    const plan = planDrop(gameRef.current, sourceId, target)
    previewRef.current = { target, plan }
    return plan
  }
  function commit(plan: DropPlan) {
    if (plan.kind === 'invalid') { setMessage(REASONS[plan.reason]); return }
    const result = applyPlan(gameRef.current, plan, () => `merge-${++idSequence.current}`)
    if (!result.ok) { setMessage('状態が変わったため取り消しました'); return }
    gameRef.current = result.state
    setGame(result.state)
    setCreatedIds(result.createdIds)
    setMessage(plan.kind === 'move' ? '移動しました'
      : `マージ成功 · Tier ${plan.outputTier} × ${result.createdIds.length}${plan.remainderIds.length ? ` · 余り${plan.remainderIds.length}体` : ''}`)
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || panel) return
    const point = localPoint(e)
    const target = targetAt(point)
    const source = target && gameRef.current.slimes.find(s => samePosition(s.position, target))
    active.current = transition(active.current, { type: 'down', id: e.pointerId, point, sourceId: source?.id ?? null, camera: cameraRef.current }).state
    setGesture(active.current)
    clearPreview()
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function update(e: ReactPointerEvent<HTMLDivElement>) {
    active.current = transition(active.current, { type: 'move', id: e.pointerId, point: localPoint(e) }).state
    const g = active.current
    setGesture(g)
    if (g.mode === 'pan' && g.single) changeCamera(panCamera(g.single.camera, viewRef.current, g.single.start, g.single.current))
    if (g.mode === 'pinch' && g.pinch) {
      const [a, b] = g.pinch.starts
      const currentA = g.contacts.find(c => c.id === a.id)!, currentB = g.contacts.find(c => c.id === b.id)!
      const ratio = distance(currentA.point, currentB.point) / Math.max(1, distance(a.point, b.point))
      changeCamera(zoomAt(g.pinch.camera, viewRef.current, midpoint(a.point, b.point), g.pinch.camera.zoom * ratio, midpoint(currentA.point, currentB.point)))
    }
    if (g.mode === 'drag' && g.single?.sourceId) setPreview(planAt(g.single.sourceId, g.single.current))
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!active.current.contacts.some(c => c.id === e.pointerId)) return
    const result = transition(active.current, { type: 'up', id: e.pointerId, point: localPoint(e) })
    // Synchronous gate before commit/releasing capture prevents duplicate pointerup commits.
    active.current = result.state
    setGesture(result.state)
    const drop = result.drop
    const plan = drop?.sourceId ? planAt(drop.sourceId, drop.current) : null
    clearPreview()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (drop && distance(drop.start, drop.current) >= 4) {
      if (plan) commit(plan)
      else setMessage(REASONS['outside-board'])
    }
  }
  function cancelPointer(e: ReactPointerEvent<HTMLDivElement>) {
    if (!active.current.contacts.some(c => c.id === e.pointerId)) return
    active.current = transition(active.current, { type: 'cancel', id: e.pointerId }).state
    setGesture(active.current)
    clearPreview()
    setMessage('操作を取り消しました')
  }
  function resetCamera() { abort(); changeCamera(initialCamera()); setMessage('表示をリセットしました') }
  function reset(id: PresetId) {
    abort(true)
    const next = createPreset(id, gameRef.current.revision + 1)
    gameRef.current = next
    setGame(next)
    setPreset(id)
    setCreatedIds([])
    changeCamera(initialCamera())
    setMessage(id === 'high' ? '上段：Tier 39→40 / 下段：Tier 40上限' : '同じTierへ重ねてドロップ')
    setPanel(null)
  }
  const plan = preview?.kind === 'merge' ? preview : null
  const dragged = gesture.mode === 'drag' ? game.slimes.find(s => s.id === gesture.single?.sourceId) : undefined
  const text = plan ? `Tier ${plan.outputTier} × ${plan.groups.reduce((n, g) => n + g.outputs.length, 0)}体`
    : preview?.kind === 'invalid' && preview.reason !== 'same-cell' ? REASONS[preview.reason] : message
  const topLeft = worldToScreen({ x: 0, y: 0 }, camera, view)
  const scale = view.fit * camera.zoom
  return <>
    <header className="app-header">
      <h1><span className="brand-icon" aria-hidden="true">♧</span> SLIME MERGE</h1>
      <div className="session-stats"><span><b data-testid="slime-count">{game.slimes.length}</b>体</span><span>最高 <b data-testid="highest-tier">Tier {game.highestTierReached}</b></span></div>
    </header>
    <section className="game-layout" aria-label="ゲーム">
      <nav className="edge-menu" aria-label="メニュー">
        {([['help', '?', '遊び方'], ['presets', '▦', '検証'], ['appearance', '✦', '外見'], ['settings', '⚙', '設定']] as const).map(([id, icon, label]) =>
          <button key={id} type="button" aria-label={id === 'appearance' ? 'スライム一覧・外見確認' : label} aria-haspopup="dialog" onClick={() => { abort(true); setPanel(id) }}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>
      <div className={`board-viewport ${reducedEffects ? 'reduced-effects' : ''}`} ref={viewport}
        data-testid="viewport" data-gesture={gesture.mode} data-zoom={camera.zoom}
        onPointerDown={down} onPointerMove={update} onPointerUp={up} onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer} onContextMenu={e => e.preventDefault()}>
        <div className="board-world" data-testid="board" style={{ transform: `translate(${topLeft.x}px, ${topLeft.y}px) scale(${scale})` }}>
          {Array.from({ length: 49 }, (_, index) => {
            const position = { x: index % 7, y: Math.floor(index / 7) }
            const slime = game.slimes.find(s => samePosition(s.position, position))
            const group = plan?.groups.find(g => slime && g.consumedIds.includes(slime.id))
            const outputGroup = plan?.groups.find(g => g.outputs.some(p => samePosition(p, position)))
            const remainder = slime && plan?.remainderIds.includes(slime.id)
            return <button key={index} type="button"
              className={`cell ${(position.x + position.y) % 2 ? 'alternate' : ''} ${group ? 'grouped' : ''} ${remainder ? 'remainder' : ''} ${selected && slime?.id === selected ? 'selected' : ''}`}
              data-cell={`${position.x},${position.y}`} data-slime-id={slime?.id} data-tier={slime?.tier} data-group={group?.number} data-output={outputGroup?.number} data-remainder={remainder ? 'true' : undefined}
              aria-label={`${position.x + 1}列${position.y + 1}行${slime ? ` Tier ${slime.tier}` : ' 空きマス'}${group ? ` 組${group.number}` : ''}${remainder ? ' 余り・残ります' : ''}`}
              style={group ? { '--group-color': GROUP_COLORS[(group.number - 1) % GROUP_COLORS.length] } as CSSProperties : undefined}
              onFocus={() => {
                // Keyboard navigation keeps the focused cell visible even after camera pan/zoom.
                if (active.current.contacts.length) return
                const center = worldToScreen({ x: position.x * 100 + 50, y: position.y * 100 + 50 }, cameraRef.current, viewRef.current)
                const margin = 50 * cameraRef.current.zoom * viewRef.current.fit
                if (center.x < margin || center.x > viewRef.current.width - margin || center.y < margin || center.y > viewRef.current.height - margin)
                  changeCamera({ ...cameraRef.current, center: { x: position.x * 100 + 50, y: position.y * 100 + 50 } })
              }}
              onKeyDown={e => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                if (active.current.contacts.length) return
                if (selected) { commit(planDrop(gameRef.current, selected, position)); setSelected(null) }
                else if (slime) setSelected(slime.id)
              }}>
              {slime && <span key={slime.id} className={`slime-piece ${slime.id === dragged?.id ? 'source-ghost' : ''} ${createdIds.includes(slime.id) ? 'born' : ''}`}><Slime tier={slime.tier} /></span>}
              {group && <span className="group-badge">{group.number}</span>}
              {remainder && <span className="keep-badge">残る</span>}
              {outputGroup && <span className="output-mark">↑{outputGroup.number}</span>}
            </button>
          })}
        </div>
        {dragged && gesture.single && <div className="drag-sprite" style={{ left: gesture.single.current.x, top: gesture.single.current.y, width: 86 * scale, height: 90 * scale, '--group-color': plan ? GROUP_COLORS[0] : 'transparent' } as CSSProperties}><Slime tier={dragged.tier} />{plan && <span className="group-badge">1</span>}</div>}
      </div>
      <aside className="camera-controls" aria-label="表示操作">
        <span className="board-label">7 × 7</span>
        <output data-testid="zoom" aria-label="ズーム倍率">{Math.round(camera.zoom * 100)}%</output>
        <div className="zoom-buttons">{([-1, 1] as const).map(dir => <button key={dir} type="button" aria-label={dir === 1 ? '拡大' : '縮小'} onClick={() => {
          abort(); changeCamera(zoomAt(cameraRef.current, viewRef.current, { x: view.width / 2, y: view.height / 2 }, cameraRef.current.zoom * (dir === 1 ? 1.2 : 1 / 1.2)))
        }}>{dir === 1 ? '+' : '−'}</button>)}</div>
        <button type="button" data-testid="reset-camera" onClick={resetCamera}>表示リセット</button>
        <span className="control-hint">ホイール / ピンチ<br />空きマスでパン</span>
      </aside>
    </section>
    <footer className={`result-bar ${plan ? 'preview-active' : ''}`} role="status" data-testid="status">
      <strong>{text}</strong>
      {plan && <small>{plan.groups.map(g => `組${g.number} ${g.consumedIds.length}→${g.outputs.length}`).join(' / ')}{plan.remainderIds.length ? ` / 余り${plan.remainderIds.length}` : ''} · ↑出力先</small>}
    </footer>
    <GameMenu panel={panel} onClose={() => setPanel(null)} preset={preset} onPreset={reset} reducedEffects={reducedEffects} onEffects={setReducedEffects} />
  </>
}
