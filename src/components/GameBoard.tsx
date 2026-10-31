import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent,
} from 'react'
import { MAX_TIER, type DropPlan, type InvalidReason } from '../domain/game'
import type { GridPosition } from '../domain/grid'
import { samePosition } from '../core/grid/coordinates'
import { SessionStore } from '../app/sessionStore'
import { baseSaleValue, generationRules, upgradeCost, EXPERIMENTAL_ECONOMY } from '../core/progression/economy'
import { sessionRules, type Command } from '../core/progression/session'
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
  const [store] = useState(() => new SessionStore({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, Date.now()))
  const [session, setSession] = useState(store.state.session)
  const [storageError, setStorageError] = useState(store.state.error)
  const [normal, setNormal] = useState(true)
  const normalRef = useRef(true)
  const [placing, setPlacing] = useState(false)
  const placingRef = useRef<number | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [saleId, setSaleId] = useState<string | null>(null)
  const saleZone = useRef<HTMLButtonElement>(null)
  const [saleHover, setSaleHover] = useState(false)
  const [viewportOrigin, setViewportOrigin] = useState({ x: 0, y: 0 })
  const [game, setGame] = useState(() => store.state.session.game)
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
  const send = useCallback((command: Command) => {
    void store.dispatch(command, Date.now()).then(state => {
      setStorageError(state.error)
      setSession(state.session)
      if (command.type === 'drop' && command.plan.kind === 'merge') setCreatedIds(state.session.game.slimes.filter(x => !gameRef.current.slimes.some(y => y.id === x.id)).map(x => x.id))
      if (normalRef.current) { gameRef.current = state.session.game; setGame(state.session.game) }
    }).catch(() => setStorageError('保存処理に失敗しました。再読み込みして続行してください'))
  }, [store])
  useEffect(() => {
    const pulse = () => {
      if (!normalRef.current || document.hidden || store.state.error) return
      const s = store.state.session, now = Date.now()
      if (now - s.generator.updatedAtMs >= 1000 || now < s.generator.updatedAtMs ||
        (s.event?.tier !== null && s.event && now >= s.event.nextPaymentAtMs)) send({ type: 'tick' })
    }
    const timer = window.setInterval(pulse, 250)
    document.addEventListener('visibilitychange', pulse)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pulse) }
  }, [send, store])


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
      if (e.key === 'Escape') { placingRef.current = null; setPlacing(false); abort(); setMessage('操作を取り消しました') }
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
    return screenToCell(p, { x: 0, y: 0 }, 700 / gameRef.current.bounds.width, gameRef.current.bounds.origin)
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
    if (normalRef.current) { send({ type: 'drop', plan }); return }
    const result = applyPlan(gameRef.current, plan, () => `merge-${++idSequence.current}`)
    if (!result.ok) { setMessage('状態が変わったため取り消しました'); return }
    gameRef.current = result.state
    setGame(result.state)
    setCreatedIds(result.createdIds)
    setMessage(plan.kind === 'move' ? '移動しました'
      : `マージ成功 · Tier ${plan.outputTier} × ${result.createdIds.length}${plan.remainderIds.length ? ` · 余り${plan.remainderIds.length}体` : ''}`)
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || panel || (normalRef.current && store.state.error)) return
    const point = localPoint(e)
    const rect = e.currentTarget.getBoundingClientRect()
    setViewportOrigin({ x: rect.left, y: rect.top })
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
    const overSale = !!(normalRef.current && g.mode === 'drag' && g.single?.sourceId && insideSale(e))
    setSaleHover(overSale)
    if (g.mode === 'drag' && g.single?.sourceId) setPreview(overSale ? null : planAt(g.single.sourceId, g.single.current))
  }
  function insideSale(e: { clientX: number; clientY: number }) {
    const r = saleZone.current?.getBoundingClientRect()
    return !!r && e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom
  }
  function chooseCell(position: GridPosition) {
    const expectedId = placingRef.current
    if (normalRef.current && expectedId !== null) {
      if (gameRef.current.slimes.some(s => samePosition(s.position, position))) return
      // Close the placement gate synchronously before awaiting persistence.
      placingRef.current = null; setPlacing(false)
      send({ type: 'withdraw', target: position, expectedId })
    } else {
      const slime = gameRef.current.slimes.find(s => samePosition(s.position, position))
      if (slime && normalRef.current) { setDetailId(slime.id); setPanel('slime') }
    }
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!active.current.contacts.some(c => c.id === e.pointerId)) return
    const singleTap = active.current.mode === 'pan' && active.current.contacts.length === 1 ? active.current.single : null
    const result = transition(active.current, { type: 'up', id: e.pointerId, point: localPoint(e) })
    // Synchronous gate before commit/releasing capture prevents duplicate pointerup commits.
    active.current = result.state
    setGesture(result.state)
    const drop = result.drop
    const plan = drop?.sourceId ? planAt(drop.sourceId, drop.current) : null
    clearPreview()
    setSaleHover(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (drop && distance(drop.start, drop.current) >= 4) {
      if (normalRef.current && insideSale(e)) {
        placingRef.current = null; setPlacing(false)
        if (drop.sourceId) { setSaleId(drop.sourceId); setPanel('sale') }
        return
      }
      if (placingRef.current !== null) return
      if (plan) commit(plan)
      else setMessage(REASONS['outside-board'])
    } else if (drop || (singleTap && distance(singleTap.start, localPoint(e)) < 4)) {
      const target = targetAt(localPoint(e))
      if (target) chooseCell(target)
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
    normalRef.current = false; setNormal(false)
    placingRef.current = null; setPlacing(false)
    const next = createPreset(id, gameRef.current.revision + 1)
    gameRef.current = next
    setGame(next)
    setPreset(id)
    setCreatedIds([])
    changeCamera(initialCamera())
    setMessage(id === 'high' ? '上段：Tier 39→40 / 下段：Tier 40上限' : '同じTierへ重ねてドロップ')
    setPanel(null)
  }
  function returnNormal() {
    abort(true); placingRef.current = null; setPlacing(false)
    normalRef.current = true; setNormal(true)
    gameRef.current = store.state.session.game; setGame(store.state.session.game)
    changeCamera(initialCamera()); setPanel(null); send({ type: 'tick' })
  }
  const rules = sessionRules(session)
  const protectedIds = normal ? session.protectedIds : []
  const detail = game.slimes.find(s => s.id === detailId)
  const sale = game.slimes.find(s => s.id === saleId)
  const event = normal ? session.event : null
  const coinText = event?.tier !== null && event ? `+${event.unitGOLD.toLocaleString()} · ${event.paid}/10` : session.lastEvent ? '10/10 完了' : ''
  const plan = preview?.kind === 'merge' ? preview : null
  const dragged = gesture.mode === 'drag' ? game.slimes.find(s => s.id === gesture.single?.sourceId) : undefined
  const text = plan ? `Tier ${plan.outputTier} × ${plan.groups.reduce((n, g) => n + g.outputs.length, 0)}体`
    : preview?.kind === 'invalid' && preview.reason !== 'same-cell' ? REASONS[preview.reason] : message
  const topLeft = worldToScreen({ x: 0, y: 0 }, camera, view)
  const scale = view.fit * camera.zoom
  return <>
    <header className="app-header">
      <h1><span className="brand-icon" aria-hidden="true">♧</span> SLIME MERGE</h1>
      <div className="session-stats">{normal && <span className="wallet" title={`${session.wallet.gold} GOLD`}>● <b data-testid="gold">{new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(session.wallet.gold)}</b></span>}<span><b data-testid="slime-count">{game.slimes.length}</b>体</span><span>最高 <b data-testid="highest-tier">Tier {game.highestTierReached}</b></span></div>
    </header>
    <section className={`game-layout ${normal ? 'normal-play' : 'debug-play'}`} aria-label="ゲーム">
      <nav className="edge-menu" aria-label="メニュー">
        {normal && <button type="button" aria-label="GOLDショップ" onClick={() => { abort(true); setPanel('shop') }}><span aria-hidden="true">♜</span>ショップ</button>}
        {([['help', '?', '遊び方'], ['presets', '▦', '検証'], ['appearance', '✦', '外見'], ['settings', '⚙', '設定']] as const).map(([id, icon, label]) =>
          <button key={id} type="button" aria-label={id === 'appearance' ? 'スライム一覧・外見確認' : label} aria-haspopup="dialog" onClick={() => { abort(true); placingRef.current = null; setPlacing(false); setPanel(id) }}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>
      <div className={`board-viewport ${(normal ? session.reducedEffects : reducedEffects) ? 'reduced-effects' : ''}`} ref={viewport}
        data-testid="viewport" data-mode={normal ? 'normal' : 'verification'} data-placing={placing} data-gesture={gesture.mode} data-zoom={camera.zoom}
        onPointerDown={down} onPointerMove={update} onPointerUp={up} onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer} onContextMenu={e => e.preventDefault()}>
        <div className="board-world" data-testid="board" style={{ gridTemplateColumns: `repeat(${game.bounds.width}, ${700 / game.bounds.width}px)`, gridTemplateRows: `repeat(${game.bounds.height}, ${700 / game.bounds.height}px)`, width: 700, height: 700, transform: `translate(${topLeft.x}px, ${topLeft.y}px) scale(${scale})` }}>
          {Array.from({ length: game.bounds.width * game.bounds.height }, (_, index) => {
            const position = { x: index % game.bounds.width, y: Math.floor(index / game.bounds.width) }
            const slime = game.slimes.find(s => samePosition(s.position, position))
            const group = plan?.groups.find(g => slime && g.consumedIds.includes(slime.id))
            const outputGroup = plan?.groups.find(g => g.outputs.some(p => samePosition(p, position)))
            const remainder = slime && plan?.remainderIds.includes(slime.id)
            return <button key={index} type="button"
              className={`cell ${event && samePosition(event.cell, position) ? 'gold-cell' : ''} ${(position.x + position.y) % 2 ? 'alternate' : ''} ${group ? 'grouped' : ''} ${remainder ? 'remainder' : ''} ${selected && slime?.id === selected ? 'selected' : ''}`}
              data-protected={slime && protectedIds.includes(slime.id) ? 'true' : undefined} data-gold-cell={event && samePosition(event.cell, position) ? event.id : undefined}
              data-cell={`${position.x},${position.y}`} data-slime-id={slime?.id} data-tier={slime?.tier} data-group={group?.number} data-output={outputGroup?.number} data-remainder={remainder ? 'true' : undefined}
              aria-label={`${position.x + 1}列${position.y + 1}行${slime ? ` Tier ${slime.tier}` : ' 空きマス'}${group ? ` 組${group.number}` : ''}${remainder ? ' 余り・残ります' : ''}`}
              style={{ width: 700 / game.bounds.width, height: 700 / game.bounds.height, ...(group ? { '--group-color': GROUP_COLORS[(group.number - 1) % GROUP_COLORS.length] } : {}) } as CSSProperties}
              onFocus={() => {
                // Keyboard navigation keeps the focused cell visible even after camera pan/zoom.
                if (active.current.contacts.length) return
                const center = worldToScreen({ x: (position.x + .5) * 700 / game.bounds.width, y: (position.y + .5) * 700 / game.bounds.height }, cameraRef.current, viewRef.current)
                const margin = 50 * cameraRef.current.zoom * viewRef.current.fit
                if (center.x < margin || center.x > viewRef.current.width - margin || center.y < margin || center.y > viewRef.current.height - margin)
                  changeCamera({ ...cameraRef.current, center: { x: (position.x + .5) * 700 / game.bounds.width, y: (position.y + .5) * 700 / game.bounds.height } })
              }}
              onKeyDown={e => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                if (active.current.contacts.length) return
                if (placingRef.current !== null) { chooseCell(position); return }
                if (selected) { commit(planDrop(gameRef.current, selected, position)); setSelected(null) }
                else if (slime) setSelected(slime.id)
              }}>
              {event && samePosition(event.cell, position) && <span className="gold-cell-label">● {event.tier === null ? 'GOLD' : `${event.paid}/10`}</span>}
              {slime && protectedIds.includes(slime.id) && <span className="protected-badge" aria-label="売却保護">◆</span>}
              {slime && <span key={slime.id} style={{ width: 602 / game.bounds.width, height: 630 / game.bounds.height }} className={`slime-piece ${slime.id === dragged?.id ? 'source-ghost' : ''} ${createdIds.includes(slime.id) ? 'born' : ''}`}><Slime tier={slime.tier} /></span>}
              {group && <span className="group-badge">{group.number}</span>}
              {remainder && <span className="keep-badge">残る</span>}
              {outputGroup && <span className="output-mark">↑{outputGroup.number}</span>}
            </button>
          })}
        </div>
        {dragged && gesture.single && <div className="drag-sprite" style={{ position: 'fixed', left: gesture.single.current.x + viewportOrigin.x, top: gesture.single.current.y + viewportOrigin.y, width: 602 / game.bounds.width * scale, height: 630 / game.bounds.height * scale, '--group-color': plan ? GROUP_COLORS[0] : 'transparent' } as CSSProperties}><Slime tier={dragged.tier} />{plan && <span className="group-badge">1</span>}</div>}
      </div>
      {normal ? <aside className="progress-controls" aria-label="生成と売却">
        <div className="generator-readout"><span>貯蔵 <b data-testid="storage-count">{session.generator.storedTiers.length}/{rules.capacity}</b></span>
          <span data-testid="generation-time">{session.generator.storedTiers.length >= rules.capacity ? '満杯・生成停止' : `次まで ${((rules.intervalMs - session.generator.progressMs) / 1000).toFixed(1)}秒`}</span>
          <progress aria-label="生成進捗" max={rules.intervalMs} value={session.generator.progressMs} /></div>
        <button type="button" className="accelerate-button" disabled={!!storageError || session.generator.storedTiers.length >= rules.capacity} onClick={() => send({ type: 'tap' })}>⚡ 生成加速<small>−{(rules.tapAdvanceMs / 1000).toFixed(1)}秒</small></button>
        <button type="button" data-testid="add-slime" className={`add-button ${placing ? 'armed' : ''}`} disabled={!!storageError || !session.generator.storedTiers.length} onClick={() => {
          abort(true)
          placingRef.current = placingRef.current === null ? store.state.session.nextId : null
          setPlacing(placingRef.current !== null)
        }}>{placing ? '配置をキャンセル' : '＋ スライム追加'}<small>{placing ? '空きマスを選択' : session.generator.storedTiers.length ? `次は Tier ${session.generator.storedTiers[0]}` : '生成を待っています'}</small></button>
        <button type="button" className={`sale-zone ${saleHover ? 'sale-hover' : ''}`} ref={saleZone} data-testid="sale-zone" onClick={() => setMessage('売却エリアへスライムをドラッグしてください')}>
          <span>♧ 売却エリア</span><small>{dragged ? protectedIds.includes(dragged.id) ? '保護中・売却不可' : `+${baseSaleValue(dragged.tier).toLocaleString()} GOLD` : 'ここへドラッグ'}</small></button>
        {event && <div className="event-readout" data-testid="gold-event">● {event.tier === null ? '金マスに配置で10回報酬' : coinText}</div>}
        {!event && session.lastEvent && <div className="event-readout" data-testid="gold-completed">● {coinText}</div>}
      </aside> : <aside className="verification-banner"><strong>検証モード</strong><span>通常プレイのセーブは保全</span><button type="button" onClick={returnNormal}>通常プレイへ戻る</button></aside>}
    </section>
    {storageError && <div className="storage-error" role="alert"><span>{storageError}</span><button type="button" onClick={() => { setStorageError(store.retry().error); send({ type: 'tick' }) }}>再試行</button><button type="button" onClick={() => window.location.reload()}>再読み込み</button></div>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="status">
      <strong>{text}</strong>
      {plan && <small>{plan.groups.map(g => `組${g.number} ${g.consumedIds.length}→${g.outputs.length}`).join(' / ')}{plan.remainderIds.length ? ` / 余り${plan.remainderIds.length}` : ''} · ↑出力先</small>}
    </div>
    <GameMenu extra={panel === 'shop' ? <>
      <p className="shop-wallet">所持 GOLD：{session.wallet.gold.toLocaleString()}</p>
      {(['speed', 'tap', 'storage'] as const).map(key => {
        const lv = session.wallet.upgrades[key], cost = upgradeCost(key, lv), max = lv >= EXPERIMENTAL_ECONOMY.shopMaxLevel
        const nextRules = generationRules({ ...session.wallet, upgrades: { ...session.wallet.upgrades, [key]: Math.min(16, lv + 1) } })
        const label = { speed: '生成間隔短縮', tap: 'クリック加速強化', storage: '貯蔵容量増加' }[key]
        const effect = (r: { intervalMs: number; capacity: number; tapAdvanceMs: number }) => key === 'speed' ? `${(r.intervalMs / 1000).toFixed(2)}秒` : key === 'tap' ? `${(r.tapAdvanceMs / 1000).toFixed(2)}秒短縮` : `${r.capacity}体`
        return <section key={key} className="shop-item"><h3>{label} · Lv {lv}</h3><p>{effect(rules)} → {max ? '最大Lv' : effect({ ...rules, ...nextRules })}</p><button type="button" data-testid={`buy-${key}`} disabled={!normal || !!storageError || max || session.wallet.gold < cost} onClick={() => send({ type: 'buy', key, expectedLevel: lv })}>{max ? '強化完了' : `${cost.toLocaleString()} GOLDで購入`}</button></section>
      })}<p className="muted">価格・生成分布・強化量は試遊用の仮設定です。</p>
    </> : panel === 'slime' && detail ? <><div className="detail-slime"><Slime tier={detail.tier} /></div><p>Tier {detail.tier} · 無属性 · 売却 {baseSaleValue(detail.tier).toLocaleString()} GOLD</p><button className="reset-button" type="button" onClick={() => send({ type: 'protect', id: detail.id })}>{protectedIds.includes(detail.id) ? '売却保護を解除' : '売却から保護する'}</button><p className="muted">保護は売却のみを防ぎます。マージ素材には使用できます。</p></> : panel === 'sale' && sale ? <>
      <div className="detail-slime"><Slime tier={sale.tier} /></div><p>Tier {sale.tier} を売却して <strong>+{baseSaleValue(sale.tier).toLocaleString()} GOLD</strong></p>
      {protectedIds.includes(sale.id) ? <p>保護中のため売却できません。個体をタップして保護を解除してください。</p> : <button className="confirm-sale" data-testid="confirm-sale" type="button" disabled={!!storageError} onClick={() => { const id = saleId; setSaleId(null); setPanel(null); if (id) send({ type: 'sell', id }) }}>売却する</button>}
      <button className="reset-button" type="button" onClick={() => { setSaleId(null); setPanel(null) }}>キャンセル・盤面へ戻す</button>
    </> : undefined} normal={normal} onNormal={returnNormal} panel={panel} onClose={() => setPanel(null)} preset={preset} onPreset={reset} reducedEffects={normal ? session.reducedEffects : reducedEffects} onEffects={value => { if (normal) send({ type: 'effects', value }); else setReducedEffects(value) }}
      onResetCamera={resetCamera} onZoom={dir => {
        abort(); changeCamera(zoomAt(cameraRef.current, viewRef.current, { x: view.width / 2, y: view.height / 2 }, cameraRef.current.zoom * (dir === 1 ? 1.2 : 1 / 1.2)))
      }} />
  </>
}
