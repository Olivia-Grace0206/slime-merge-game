import { attributeText } from './attributeLabels'
import { GoldBag } from './ProgressIcons'
import { RESEARCH_CAPS, researchCost, frequencyCost, EXPERIMENTAL_RESEARCH } from '../core/progression/research'
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
import { GeneratorPanel } from './GeneratorPanel'
import { GameMenu, type Panel } from './GameMenu'

const GROUP_COLORS = ['#e58522', '#1b9db7', '#9460ce', '#df6392', '#71992c', '#5970d1', '#a46a49', '#b9871f', '#427e89', '#a85b9a']
const REASONS: Record<InvalidReason, string> = {
  'invalid-state': '盤面を確認できません。リセットしてください',
  'missing-source': '操作を取り消しました',
  'outside-board': '盤面外のため取り消しました',
  'same-cell': '同じTierへ重ねてドロップ',
  'different-tier': 'Tierが異なります',
  'too-few': '対象が足りません（3体以上必要）',
  'research-locked': 'スライム研究で次のTierを解放してください（消費なし）',
  'max-tier': `Tier ${MAX_TIER}は上限です（消費なし）`,
}
export function GameBoard() {
  const [store] = useState(() => new SessionStore({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, Date.now()))
  const [session, setSession] = useState(store.state.session)
  const [storageError, setStorageError] = useState(store.state.error)
  const [normal, setNormal] = useState(true)
  const normalRef = useRef(true)
  const touchContext = useRef(false)
  const hold = useRef<{ timer: number; id: number; sourceId: string; start: Point } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
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
  const gestureViewport = useRef({ width: 0, height: 0 })
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
      if (command.type === 'withdraw' || (command.type === 'drop' && command.plan.kind === 'merge')) setCreatedIds(state.session.game.slimes.filter(x => !gameRef.current.slimes.some(y => y.id === x.id)).map(x => x.id))
      if (normalRef.current) { gameRef.current = state.session.game; setGame(state.session.game) }
    }).catch(() => setStorageError('保存処理に失敗しました。再読み込みして続行してください'))
  }, [store])
  useEffect(() => {
    const pulse = () => {
      if (!normalRef.current || document.hidden || store.state.error) return
      const s = store.state.session, now = Date.now()
      if (now - s.generator.updatedAtMs >= 1000 || now < s.generator.updatedAtMs ||
        (s.generator.storedTiers.length < sessionRules(s).capacity && now - s.generator.updatedAtMs + s.generator.progressMs >= sessionRules(s).intervalMs) ||
        (s.event?.tier !== null && s.event && now >= s.event.nextPaymentAtMs)) send({ type: 'tick' })
    }
    const timer = window.setInterval(pulse, 250)
    document.addEventListener('visibilitychange', pulse)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pulse) }
  }, [send, store])

  useEffect(() => {
    const event = session.event
    if (!normal || storageError || !event || event.tier === null) return
    // Schedule the saved deadline directly; ordinary polling stays inexpensive.
    const timer = window.setTimeout(() => { if (!document.hidden) send({ type: 'tick' }) }, Math.max(0, event.nextPaymentAtMs - Date.now()))
    return () => clearTimeout(timer)
  }, [normal, session.event, storageError, send])


  const changeCamera = useCallback((next: Camera) => {
    cameraRef.current = next
    setCamera(next)
  }, [])
  const clearPreview = useCallback(() => {
    previewRef.current = null
    setPreview(null)
    setSelected(null)
  }, [])
  const cancelHold = useCallback(() => { if (hold.current) clearTimeout(hold.current.timer); hold.current = null }, [])
  useEffect(() => () => cancelHold(), [cancelHold])
  const abort = useCallback((clearContacts = false) => {
    cancelHold()
    const contacts = active.current.contacts
    active.current = clearContacts ? idleGesture() : transition(active.current, { type: 'cancel' }).state
    setGesture(active.current)
    clearPreview()
    setSaleHover(false)
    if (clearContacts) for (const c of contacts) {
      if (viewport.current?.hasPointerCapture(c.id)) viewport.current.releasePointerCapture(c.id)
    }
  }, [clearPreview, cancelHold])

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
    const otherFinger = (e: PointerEvent) => { if (active.current.contacts.length && !active.current.contacts.some(c => c.id === e.pointerId) && !element.contains(e.target as Node)) abort() }
    document.addEventListener('pointerdown', otherFinger, true)
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
      document.removeEventListener('pointerdown', otherFinger, true)
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
    const plan = planDrop(gameRef.current, sourceId, target, normalRef.current ? store.state.session.researchMaxTier : MAX_TIER)
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
    setMessage(plan.kind === 'swap' ? '位置を交換しました' : plan.kind === 'move' ? '移動しました'
      : `マージ成功 · Tier ${plan.outputTier} × ${result.createdIds.length}${plan.remainderIds.length ? ` · 余り${plan.remainderIds.length}体` : ''}`)
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    touchContext.current = e.pointerType !== 'mouse'
    if (e.button !== 0 || panel || (normalRef.current && store.state.error)) return
    cancelHold()
    if (!active.current.contacts.length) gestureViewport.current = { width: window.innerWidth, height: window.innerHeight }
    const point = localPoint(e)
    const rect = e.currentTarget.getBoundingClientRect()
    setViewportOrigin({ x: rect.left, y: rect.top })
    const target = targetAt(point)
    const source = target && gameRef.current.slimes.find(s => samePosition(s.position, target))
    active.current = transition(active.current, { type: 'down', id: e.pointerId, point, sourceId: source?.id ?? null, camera: cameraRef.current }).state
    setGesture(active.current)
    setSaleHover(false)
    clearPreview()
    e.currentTarget.setPointerCapture(e.pointerId)
    if (e.pointerType !== 'mouse' && normalRef.current && source && active.current.contacts.length === 1 && !active.current.blocked) {
      const id = e.pointerId, sourceId = source.id
      hold.current = { id, sourceId, start: point, timer: window.setTimeout(() => {
        const pending = hold.current
        if (!pending || active.current.contacts.length !== 1 || active.current.single?.id !== id || active.current.mode !== 'drag') return
        hold.current = null
        // Block until every finger is released. A held specimen cannot drop or merge.
        abort(); send({ type: 'protect', id: sourceId }); setMessage('売却保護を切り替えました')
      }, 500) }
    }
  }
  function update(e: ReactPointerEvent<HTMLDivElement>) {
    if (hold.current?.id === e.pointerId && distance(hold.current.start, localPoint(e)) > 8) cancelHold()
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
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    // ResizeObserver/resize notifications can arrive after pointerup; never use the old gesture geometry.
    if (gestureViewport.current.width !== window.innerWidth || gestureViewport.current.height !== window.innerHeight) { abort(true); return }
    const rect = e.currentTarget.getBoundingClientRect()
    if (Math.abs(rect.width - viewRef.current.width) > 1 || Math.abs(rect.height - viewRef.current.height) > 1) { abort(true); return }
    if (!active.current.contacts.some(c => c.id === e.pointerId)) return
    cancelHold()
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
        if (drop.sourceId) send({ type: 'sell', id: drop.sourceId })
        return
      }
      if (plan) commit(plan)
      else setMessage(REASONS['outside-board'])
    }
  }
  function cancelPointer(e: ReactPointerEvent<HTMLDivElement>) {
    cancelHold()
    if (!active.current.contacts.some(c => c.id === e.pointerId)) return
    active.current = transition(active.current, { type: 'cancel', id: e.pointerId }).state
    setGesture(active.current)
    clearPreview()
    setSaleHover(false)
    setMessage('操作を取り消しました')
  }
  function resetCamera() { abort(); changeCamera(initialCamera()); setMessage('表示をリセットしました') }
  function reset(id: PresetId) {
    abort(true)
    normalRef.current = false; setNormal(false)
    
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
    abort(true); 
    normalRef.current = true; setNormal(true)
    gameRef.current = store.state.session.game; setGame(store.state.session.game)
    changeCamera(initialCamera()); setPanel(null); send({ type: 'tick' })
  }
  const saleValue = (tier: number) => Math.min(baseSaleValue(tier), Number.MAX_SAFE_INTEGER - session.wallet.gold)
  const rules = sessionRules(session)
  const protectedIds = normal ? session.protectedIds : []
  const detail = game.slimes.find(s => s.id === detailId)
  const event = normal ? session.event : null
  const coinText = event?.tier !== null && event ? `+${event.unitGOLD.toLocaleString()} · ${event.paid}/10` : session.lastEvent ? (session.lastEvent.paid !== undefined && session.lastEvent.paid < 10 ? `${session.lastEvent.paid}/10 終了 · 未払い失効` : '10/10 完了') : ''
  const plan = preview?.kind === 'merge' ? preview : null
  const swap = preview?.kind === 'swap' ? preview : null
  const dragged = gesture.mode === 'drag' ? game.slimes.find(s => s.id === gesture.single?.sourceId) : undefined
  const showPrices = normal && saleHover && !!dragged && gesture.mode === 'drag'
  const priceTag = (tier: number, id: string) => <span className="price-tag" data-testid="sale-price" data-for={id} title={`${saleValue(tier).toLocaleString('en-US')} GOLD`}><svg className="price-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#ffd66f" stroke="#b68a32" strokeWidth="2"/><path d="M12 6H8v8h4M10 5v10" fill="none" stroke="#a57425" strokeWidth="1.5"/></svg><b>{saleValue(tier).toLocaleString('en-US').split(',').map((part, i, a) => <span key={i}>{part}{i < a.length - 1 ? ',' : ''}<wbr /></span>)}</b>{protectedIds.includes(id) && <small>保護中</small>}</span>
  const text = swap ? `⇄ 位置交換${swap.reason === 'research-locked' ? ' · 研究未解放（消費なし）' : ''}` : plan ? `Tier ${plan.outputTier} × ${plan.groups.reduce((n, g) => n + g.outputs.length, 0)}体`
    : preview?.kind === 'invalid' && preview.reason !== 'same-cell' ? REASONS[preview.reason] : message
  const topLeft = worldToScreen({ x: 0, y: 0 }, camera, view)
  const scale = view.fit * camera.zoom
  return <>
    <header className={`app-header ${normal && session.goldFormat === 'full' && String(session.wallet.gold).length > 12 ? 'wide-gold' : ''}`}>
      <h1><span className="brand-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 16C2 15 3 2 11 4c4 0 5 5 5 8 0-10 13-12 13-4 1 7-7 8-10 8 10 0 12 13 4 13-7 1-8-7-8-10 0 9-13 12-13 4-1-6 6-8 11-8Z"/><path d="M17 17q-1 8 5 13" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span> SLIME MERGE</h1>
      <div className="session-stats">{normal && <span key={`${event?.id ?? session.lastEvent?.id}-${event?.paid ?? 10}`} className={`wallet ${session.reducedEffects ? 'reduced-effects' : ''} ${event?.paid || session.lastEvent ? 'receipt-pop' : ''}`} title={`${session.wallet.gold} GOLD`}><GoldBag /><b data-testid="gold">{new Intl.NumberFormat('en-US', { notation: session.goldFormat === 'compact' ? 'compact' : 'standard', maximumFractionDigits: session.goldFormat === 'compact' ? 1 : 0 }).format(session.wallet.gold)}</b><small>GOLD</small></span>}<span><b data-testid="slime-count">{game.slimes.length}</b>体</span><span>最高 <b data-testid="highest-tier">Tier {game.highestTierReached}</b></span></div>
    </header>
    <section className={`game-layout ${normal ? 'normal-play' : 'debug-play'}`} aria-label="ゲーム">
      <nav className="edge-menu" aria-label="メニュー">
        {normal && <button type="button" aria-label="GOLDショップ" onClick={() => { abort(true); setPanel('shop') }}><span aria-hidden="true">♜</span>ショップ</button>}
        {([['attributes', '◇', '属性'], ['help', '?', '遊び方'], ['presets', '▦', '検証'], ['appearance', '✦', '外見'], ['settings', '⚙', '設定']] as const).map(([id, icon, label]) =>
          <button key={id} type="button" aria-label={id === 'appearance' ? 'スライム一覧・外見確認' : label} aria-haspopup="dialog" onClick={() => { abort(true); setPanel(id) }}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>
      <div className={`board-viewport ${(normal ? session.reducedEffects : reducedEffects) ? 'reduced-effects' : ''}`} ref={viewport}
        data-testid="viewport" data-mode={normal ? 'normal' : 'verification'} data-gesture={gesture.mode} data-zoom={camera.zoom}
        onPointerDown={down} onPointerMove={update} onPointerUp={up} onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer} onContextMenu={e => {
          e.preventDefault()
          if (touchContext.current) return // Native long-press contextmenu must not toggle twice.
          abort(true)
          const target = targetAt(localPoint(e)), slime = target && gameRef.current.slimes.find(s => samePosition(s.position, target))
          if (normalRef.current && slime) { send({ type: 'protect', id: slime.id }); setMessage('売却保護を切り替えました') }
        }}>
        <div className="board-world" data-testid="board" style={{ gridTemplateColumns: `repeat(${game.bounds.width}, ${700 / game.bounds.width}px)`, gridTemplateRows: `repeat(${game.bounds.height}, ${700 / game.bounds.height}px)`, width: 700, height: 700, transform: `translate(${topLeft.x}px, ${topLeft.y}px) scale(${scale})` }}>
          {Array.from({ length: game.bounds.width * game.bounds.height }, (_, index) => {
            const position = { x: index % game.bounds.width, y: Math.floor(index / game.bounds.width) }
            const slime = game.slimes.find(s => samePosition(s.position, position))
            const group = plan?.groups.find(g => slime && g.consumedIds.includes(slime.id))
            const outputGroup = plan?.groups.find(g => g.outputs.some(p => samePosition(p, position)))
            const remainder = slime && plan?.remainderIds.includes(slime.id)
            return <button key={index} type="button"
              className={`cell ${event && samePosition(event.cell, position) ? 'gold-cell' : ''} ${(position.x + position.y) % 2 ? 'alternate' : ''} ${swap && (slime?.id === swap.sourceId || slime?.id === swap.targetId) ? 'swap-cell' : ''} ${group ? 'grouped' : ''} ${remainder ? 'remainder' : ''} ${selected && slime?.id === selected ? 'selected' : ''}`}
              data-protected={slime && protectedIds.includes(slime.id) ? 'true' : undefined} data-gold-cell={event && samePosition(event.cell, position) ? event.id : undefined}
              data-cell={`${position.x},${position.y}`} data-slime-id={slime?.id} data-tier={slime?.tier} data-group={group?.number} data-output={outputGroup?.number} data-remainder={remainder ? 'true' : undefined}
              title={slime && normal ? `Tier ${slime.tier} · ${attributeText(slime.attributes)} · +${saleValue(slime.tier).toLocaleString()} GOLD${protectedIds.includes(slime.id) ? ' · 売却保護中' : ''}` : undefined}
              aria-label={`${position.x + 1}列${position.y + 1}行${slime ? ` Tier ${slime.tier} ${attributeText(slime.attributes)}` : ' 空きマス'}${group ? ` 組${group.number}` : ''}${remainder ? ' 余り・残ります' : ''}${slime && protectedIds.includes(slime.id) ? ' 売却保護中' : ''}`}
              aria-description={normal && slime ? 'Pキーで売却保護、Iキーで詳細。Enterで選択後、売却エリアへTabしてEnterで売却。' : undefined}
              style={{ width: 700 / game.bounds.width, height: 700 / game.bounds.height, ...(group ? { '--group-color': GROUP_COLORS[(group.number - 1) % GROUP_COLORS.length] } : {}) } as CSSProperties}
              onFocus={() => {
                // Keyboard navigation keeps the focused cell visible even after camera pan/zoom.
                if (active.current.contacts.length) return
                const center = worldToScreen({ x: (position.x + .5) * 700 / game.bounds.width, y: (position.y + .5) * 700 / game.bounds.height }, cameraRef.current, viewRef.current)
                const margin = 350 / game.bounds.width * cameraRef.current.zoom * viewRef.current.fit
                if (center.x < margin || center.x > viewRef.current.width - margin || center.y < margin || center.y > viewRef.current.height - margin)
                  changeCamera({ ...cameraRef.current, center: { x: (position.x + .5) * 700 / game.bounds.width, y: (position.y + .5) * 700 / game.bounds.height } })
              }}
              onKeyDown={e => {
                if (normalRef.current && slime && ['p', 'P', 'i', 'I'].includes(e.key)) {
                  e.preventDefault(); if (active.current.contacts.length) return
                  if (e.key.toLowerCase() === 'p') send({ type: 'protect', id: slime.id })
                  else { setDetailId(slime.id); setPanel('slime') }
                  return
                }
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                if (active.current.contacts.length) return
                if (selected) { commit(planDrop(gameRef.current, selected, position, normalRef.current ? store.state.session.researchMaxTier : MAX_TIER)); setSelected(null) }
                else if (slime) setSelected(slime.id)
              }}>
              {event && samePosition(event.cell, position) && <span className="gold-cell-label">● {event.tier === null ? 'GOLD' : `${event.paid}/10`}</span>}
              {event && event.paid > 0 && samePosition(event.cell, position) && <span key={`${event.id}-${event.paid}`} className="gold-burst">+{session.wallet.gold === Number.MAX_SAFE_INTEGER ? '上限' : event.unitGOLD.toLocaleString()}</span>}
              {slime && protectedIds.includes(slime.id) && <span className="protected-badge" aria-label="売却保護"><svg viewBox="0 0 20 23" width="18" height="20" aria-hidden="true"><path d="M5 10V6a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="3"/><rect x="2" y="9" width="16" height="13" rx="3" fill="#fff4c5" stroke="currentColor" strokeWidth="2"/><path d="M10 14v4" stroke="currentColor" strokeWidth="2"/></svg></span>}
              {slime && <span key={slime.id} style={{ width: 602 / game.bounds.width, height: 630 / game.bounds.height }} className={`slime-piece ${slime.id === dragged?.id ? 'source-ghost' : ''} ${createdIds.includes(slime.id) ? 'born' : ''}`}><Slime tier={slime.tier} attributes={slime.attributes} /></span>}
              {swap && (slime?.id === swap.sourceId || slime?.id === swap.targetId) && <span className="swap-badge" aria-label="位置交換">⇄</span>}
              {group && <span className="group-badge">{group.number}</span>}
              {remainder && <span className="keep-badge">残る</span>}
              {outputGroup && <span className="output-mark">↑{outputGroup.number}</span>}
            </button>
          })}
        </div>
        {plan && <div className="operation-preview merge-attribute-preview" data-testid="attribute-preview"><strong>マージ → Tier {plan.outputTier}</strong>{plan.groups.map(g => <small key={g.number}>組{g.number} ×{g.outputs.length}：{attributeText(g.attributes)}</small>)}<small>変異 仮1%/組・空き属性枠のみ</small></div>}
        {swap && <div className="operation-preview" data-testid="swap-preview"><strong>⇄ 位置交換</strong><small>{swap.reason === 'research-locked' ? '研究未解放 · 素材消費なし' : swap.reason === 'attribute-limit' ? '属性上限3種類（仮）· 全属性保持' : '2体の位置だけ交換'}</small></div>}
        {showPrices && <div className="price-layer" aria-label="全スライムの売却受取額">{game.slimes.map(slime => {
          const point = worldToScreen({ x: (slime.position.x + .5) * 700 / game.bounds.width, y: (slime.position.y + .04) * 700 / game.bounds.height }, camera, view)
          return <div className="price-anchor" key={slime.id} style={{ left: point.x, top: point.y, width: Math.min(140, 700 / game.bounds.width * scale - 5) }}>{priceTag(slime.tier, slime.id)}</div>
        })}</div>}
        {dragged && gesture.single && <div className="drag-sprite" style={{ position: 'fixed', left: gesture.single.current.x + viewportOrigin.x, top: gesture.single.current.y + viewportOrigin.y, width: 602 / game.bounds.width * scale, height: 630 / game.bounds.height * scale, '--group-color': plan ? GROUP_COLORS[0] : 'transparent' } as CSSProperties}><Slime tier={dragged.tier} attributes={dragged.attributes} />{showPrices && <div className="drag-price">{priceTag(dragged.tier, dragged.id)}</div>}{plan && <span className="group-badge">1</span>}</div>}
      </div>
      {normal ? <aside className={`progress-controls ${session.reducedEffects ? 'reduced-effects' : ''}`} aria-label="生成と売却">
        <GeneratorPanel session={session} disabled={!!storageError} fullBoard={game.slimes.length >= 16} onTap={() => send({ type: 'tap' })} onAdd={() => {
          abort(true); send({ type: 'withdraw', expectedId: store.state.session.nextId })
        }} />
        <button type="button" className={`sale-zone ${saleHover ? 'sale-hover' : ''}`} ref={saleZone} data-testid="sale-zone" onClick={() => {
          if (selected) { const id = selected; clearPreview(); send({ type: 'sell', id }); return }
          setMessage('売却エリアへスライムをドラッグしてください')
        }}>
          <span className="shipping-art" aria-hidden="true">▱<i>●</i></span><span>売却エリア</span><small>{dragged ? protectedIds.includes(dragged.id) ? '保護中・売却不可' : `Tier ${dragged.tier} · +${saleValue(dragged.tier).toLocaleString()} GOLD` : selected ? '選択した個体を売却' : 'ここへドロップで売却'}</small></button>
        {event && <div className="event-readout" data-testid="gold-event" aria-live="polite"><span key={`${event.id}-${event.paid}`} className={event.paid ? 'coin-pop' : ''}>● {event.tier === null ? '金マスに配置で10回報酬' : coinText}</span></div>}
        {!event && session.lastEvent && <div className="event-readout" data-testid="gold-completed">● {coinText}</div>}
      </aside> : <aside className="verification-banner"><strong>検証モード</strong><span>通常プレイのセーブは保全</span><button type="button" onClick={returnNormal}>通常プレイへ戻る</button></aside>}
    </section>
    {swap?.reason === 'research-locked' && <div className="research-notice" role="alert">研究上限 Tier {session.researchMaxTier} · ショップで解放できます（消費なし）</div>}
    {storageError && <div className="storage-error" role="alert"><span>{storageError}</span><button type="button" onClick={() => { setStorageError(store.retry().error); send({ type: 'tick' }) }}>再試行</button><button type="button" onClick={() => window.location.reload()}>再読み込み</button></div>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="status">
      <strong>{text}</strong>
      {plan && <small>{plan.groups.map(g => `組${g.number} ${g.consumedIds.length}→${g.outputs.length}`).join(' / ')}{plan.remainderIds.length ? ` / 余り${plan.remainderIds.length}` : ''} · ↑出力先</small>}
    </div>
    <GameMenu extra={panel === 'attributes' ? <><p>属性の種類とLvを育てられます。特殊効果は次段階で実装。現在の売値・生成速度は属性で変わりません。</p><div className="attribute-roster">{game.slimes.map(s => <button type="button" key={s.id} onClick={() => { setDetailId(s.id); setPanel('slime') }}><b>Tier {s.tier} · {s.position.x + 1}列{s.position.y + 1}行</b><span>{attributeText(s.attributes)}</span></button>)}{!game.slimes.length && <p>盤面にスライムを追加してください。</p>}</div></> : panel === 'settings' ? <label className="setting-row"><input type="checkbox" data-testid="compact-gold" checked={session.goldFormat === 'compact'} disabled={!normal || !!storageError} onChange={e => send({ type: 'gold-format', value: e.target.checked ? 'compact' : 'full' })} />GOLDをK/Mなどで短縮表示</label> : panel === 'shop' ? <>
      <p className="shop-wallet">所持 GOLD：{session.wallet.gold.toLocaleString()}</p>
      {(['speed', 'tap', 'storage'] as const).map(key => {
        const lv = session.wallet.upgrades[key], cost = upgradeCost(key, lv), max = lv >= EXPERIMENTAL_ECONOMY.shopMaxLevel
        const nextRules = generationRules({ ...session.wallet, upgrades: { ...session.wallet.upgrades, [key]: Math.min(16, lv + 1) } })
        const label = { speed: '生成間隔短縮', tap: 'クリック加速強化', storage: '貯蔵容量増加' }[key]
        const effect = (r: { intervalMs: number; capacity: number; tapAdvanceMs: number }) => key === 'speed' ? `${(r.intervalMs / 1000).toFixed(2)}秒` : key === 'tap' ? `${(r.tapAdvanceMs / 1000).toFixed(2)}秒短縮` : `${r.capacity}体`
        return <section key={key} className="shop-item"><h3>{label} · Lv {lv}</h3><p>{effect(rules)} → {max ? '最大Lv' : effect({ ...rules, ...nextRules })}</p><button type="button" data-testid={`buy-${key}`} disabled={!normal || !!storageError || max || session.wallet.gold < cost} onClick={() => send({ type: 'buy', key, expectedLevel: lv })}>{max ? '強化完了' : `${cost.toLocaleString()} GOLDで購入`}</button></section>
      })}
      <section className="shop-item" aria-label="GOLDマス解放"><h3>{session.goldCellUnlocked ? '🟡 GOLDマス解放済み' : '🔒 GOLDマス解放'}</h3><p>空きマスにランダム出現。スライムを置くと350ms × 10回の報酬。</p><button type="button" data-testid="buy-gold-unlock" disabled={!!storageError || session.goldCellUnlocked || session.wallet.gold < EXPERIMENTAL_RESEARCH.goldUnlockCost} onClick={() => send({ type: 'gold-unlock' })}>{session.goldCellUnlocked ? '解放済み' : `${EXPERIMENTAL_RESEARCH.goldUnlockCost.toLocaleString()} GOLDで解放`}</button></section>
      <section className="shop-item"><h3>GOLDマス出現頻度 · Lv {session.goldFrequencyLevel}</h3><p>{session.goldCellUnlocked ? `次回予約から待ち時間を最大25%短縮（現在${session.goldFrequencyLevel * 5}%）` : 'GOLDマス解放後に購入できます'}</p><button type="button" data-testid="buy-gold-frequency" disabled={!!storageError || !session.goldCellUnlocked || session.goldFrequencyLevel >= 5 || session.wallet.gold < frequencyCost(session.goldFrequencyLevel)} onClick={() => send({ type: 'gold-frequency', expectedLevel: session.goldFrequencyLevel })}>{session.goldFrequencyLevel >= 5 ? '強化完了' : `${frequencyCost(session.goldFrequencyLevel).toLocaleString()} GOLDで購入`}</button></section>
      <section className="shop-item research-shop" aria-label="スライム研究"><h3>スライム研究</h3><p className="research-balance">所持 GOLD：{session.wallet.gold.toLocaleString('en-US')}</p><p>進化上限 <strong data-testid="research-cap">Tier {session.researchMaxTier}</strong> ／ 最終目標 Tier 40</p><p>発見済み：Tier {session.game.highestTierReached}。研究だけでは新Tierは発見されません。</p>
      {session.researchLevel < RESEARCH_CAPS.length - 1 ? <><p>次の進化上限：Tier {RESEARCH_CAPS[session.researchLevel + 1]} ／ 必要 {researchCost(session.researchLevel).toLocaleString()} GOLD</p><button type="button" data-testid="buy-research" disabled={!!storageError || session.wallet.gold < researchCost(session.researchLevel)} onClick={() => send({ type: 'research', expectedLevel: session.researchLevel })}>{session.wallet.gold < researchCost(session.researchLevel) ? 'GOLD不足 · ' : ''}{researchCost(session.researchLevel).toLocaleString()} GOLDで研究</button></> : <p>最終研究完了！ Tier40まで進化できます。</p>}
      <p className="research-history">解放済み：{RESEARCH_CAPS.slice(0, session.researchLevel + 1).map(cap => `Tier${cap}`).join(' / ')}</p></section>
      <p className="muted">価格・生成分布・強化量は試遊用の仮設定です。</p>
    </> : panel === 'slime' && detail ? <><div className="detail-slime"><Slime tier={detail.tier} attributes={detail.attributes} /></div><p>Tier {detail.tier} · {attributeText(detail.attributes)} · 売却 {saleValue(detail.tier).toLocaleString()} GOLD</p><button className="reset-button" type="button" onClick={() => send({ type: 'protect', id: detail.id })}>{protectedIds.includes(detail.id) ? '売却保護を解除' : '売却から保護する'}</button><p className="muted">属性の特殊効果は次段階で実装します。</p><p className="muted">保護は売却のみを防ぎます。マージ素材には使用できます。</p></> : undefined} normal={normal} onNormal={returnNormal} panel={panel} onClose={() => setPanel(null)} preset={preset} onPreset={reset} reducedEffects={normal ? session.reducedEffects : reducedEffects} onEffects={value => { if (normal) send({ type: 'effects', value }); else setReducedEffects(value) }}
      onResetCamera={resetCamera} onZoom={dir => {
        abort(); changeCamera(zoomAt(cameraRef.current, viewRef.current, { x: view.width / 2, y: view.height / 2 }, cameraRef.current.zoom * (dir === 1 ? 1.2 : 1 / 1.2)))
      }} />
  </>
}


