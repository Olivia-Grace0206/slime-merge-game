import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { MAX_TIER, type DropPlan, type InvalidReason } from '../domain/game'
import type { GridPosition } from '../domain/grid'
import { samePosition } from '../core/grid/coordinates'
import { applyPlan } from '../core/merge/apply'
import { planDrop } from '../core/merge/plan'
import { panOffset, screenToCell, type Point } from '../core/input/coordinates'
import { createPreset, PRESETS, type PresetId } from '../app/presets'
import { Slime } from './Slime'

const GROUP_COLORS = [
  '#f19a37',
  '#35b9cf',
  '#a778df',
  '#ed79a6',
  '#81ac38',
  '#657ddd',
  '#b37b57',
  '#ca9732',
  '#568f99',
  '#b76eaa',
]
const REASONS: Record<InvalidReason, string> = {
  'invalid-state': '盤面を確認できません。配置をリセットしてください。',
  'missing-source': '操作を取り消しました。',
  'outside-board': '盤面の外です。元の場所へ戻しました。',
  'same-cell': '同じ色のスライムへ、重ねて離してみよう。',
  'different-tier': '同じTierのスライムに重ねてね。',
  'too-few': 'マージには、ドラッグ中の1体を含めて3体以上必要です。',
  'max-tier': `Tier ${MAX_TIER}は今の最終段階。消費せず元へ戻します。`,
}
type Gesture = {
  pointerId: number
  start: Point
  current: Point
  initialCamera: Point
  sourceId: string | null
  target: GridPosition | null
  plan: DropPlan | null
}
export function GameBoard() {
  const [game, setGame] = useState(() => createPreset('five'))
  const gameRef = useRef(game)
  const [preset, setPreset] = useState<PresetId>('five')
  const [camera, setCamera] = useState<Point>({ x: 0, y: 0 })
  const cameraRef = useRef(camera)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const active = useRef<Gesture | null>(null)
  const world = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('左のスライムを、真ん中の仲間へ重ねてみよう！')
  const [createdIds, setCreatedIds] = useState<readonly string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const idSequence = useRef(0)

  function clearGesture() {
    const pointerId = active.current?.pointerId
    active.current = null
    setGesture(null)
    if (pointerId !== undefined && viewport.current?.hasPointerCapture(pointerId))
      viewport.current.releasePointerCapture(pointerId)
  }
  function cancel() {
    if (active.current) {
      const previousCamera = active.current.initialCamera
      clearGesture()
      setSelected(null)
      cameraRef.current = previousCamera
      setCamera(previousCamera)
      setMessage('操作を取り消しました。スライムは元の場所にいます。')
    }
  }
  // Losing focus/capture/visibility is an abort, never an implicit drop.
  useEffect(() => {
    const abort = () => {
      const g = active.current
      if (!g) return
      active.current = null
      setGesture(null)
      if (viewport.current?.hasPointerCapture(g.pointerId))
        viewport.current.releasePointerCapture(g.pointerId)
      cameraRef.current = g.initialCamera
      setCamera(g.initialCamera)
      setMessage('操作を取り消しました。スライムは元の場所にいます。')
    }
    const visibility = () => {
      if (document.hidden) abort()
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abort()
        setSelected(null)
      }
    }
    window.addEventListener('blur', abort)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('blur', abort)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('keydown', escape)
    }
  }, [])

  function targetAt(point: Point): GridPosition | null {
    const board = world.current?.getBoundingClientRect(),
      view = viewport.current?.getBoundingClientRect()
    if (
      !board ||
      !view ||
      point.x < view.left ||
      point.x >= view.right ||
      point.y < view.top ||
      point.y >= view.bottom
    )
      return null
    const border = world.current?.clientLeft ?? 0
    return screenToCell(
      point,
      { x: board.left + border, y: board.top + border },
      (world.current?.clientWidth ?? board.width) / gameRef.current.bounds.width,
      gameRef.current.bounds.origin,
    )
  }
  function commit(plan: DropPlan) {
    if (plan.kind === 'invalid') {
      setMessage(REASONS[plan.reason])
      return
    }
    const result = applyPlan(gameRef.current, plan, () => `merge-${++idSequence.current}`)
    if (!result.ok) {
      setMessage('状態が変わったため、操作を安全に取り消しました。')
      return
    }
    gameRef.current = result.state
    setGame(result.state)
    setCreatedIds(result.createdIds)
    setMessage(
      plan.kind === 'move'
        ? 'ぷにっ。お引っ越しできたよ。'
        : `マージ成功！ Tier ${plan.outputTier} × ${result.createdIds.length}体${plan.remainderIds.length ? `・元のTierを${plan.remainderIds.length}体キープ` : ''}`,
    )
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (active.current || !e.isPrimary || e.button !== 0) return
    const point = { x: e.clientX, y: e.clientY },
      target = targetAt(point)
    const source = target && gameRef.current.slimes.find((s) => samePosition(s.position, target))
    const g: Gesture = {
      pointerId: e.pointerId,
      start: point,
      current: point,
      initialCamera: cameraRef.current,
      sourceId: source?.id ?? null,
      target,
      plan: null,
    }
    active.current = g
    setGesture(g)
    setSelected(null)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function update(e: ReactPointerEvent<HTMLDivElement>): Gesture | null {
    const g = active.current
    if (!g || e.pointerId !== g.pointerId) return null
    const point = { x: e.clientX, y: e.clientY }
    if (!g.sourceId) {
      const nextCamera = panOffset(
        g.start,
        point,
        g.initialCamera,
        (viewport.current?.clientWidth ?? 400) * 0.3,
      )
      cameraRef.current = nextCamera
      setCamera(nextCamera)
      const next = { ...g, current: point }
      active.current = next
      setGesture(next)
      return next
    }
    const target = targetAt(point)
    const unchanged = target && g.target && samePosition(target, g.target)
    const plan =
      unchanged && g.plan ? g.plan : target ? planDrop(gameRef.current, g.sourceId, target) : null
    const next = { ...g, current: point, target, plan }
    active.current = next
    setGesture(next)
    return next
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    const g = update(e)
    if (!g) return
    // Clear synchronously before commit: subsequent pointerup cannot apply twice.
    clearGesture()
    if (g.sourceId) {
      if (Math.hypot(g.current.x - g.start.x, g.current.y - g.start.y) < 4) return
      if (g.plan) commit(g.plan)
      else setMessage('盤面の外です。元の場所へ戻しました。')
    }
  }
  function reset(id: PresetId) {
    clearGesture()
    setSelected(null)
    const next = createPreset(id, gameRef.current.revision + 1)
    gameRef.current = next
    setGame(next)
    setPreset(id)
    setCreatedIds([])
    cameraRef.current = { x: 0, y: 0 }
    setCamera({ x: 0, y: 0 })
    setMessage(
      id === 'high'
        ? `上段はTier ${MAX_TIER - 1}→${MAX_TIER}、下段は上限キャンセルを試せます。`
        : '左の1体を、中央の仲間に重ねて離してね。',
    )
  }
  const plan = gesture?.plan?.kind === 'merge' ? gesture.plan : null
  const dragged = game.slimes.find((s) => s.id === gesture?.sourceId)
  const previewText = plan
    ? `Tier ${plan.outputTier} × ${plan.groups.reduce((n, g) => n + g.outputs.length, 0)}体に進化！`
    : gesture?.plan?.kind === 'invalid' && gesture.plan.reason !== 'same-cell'
      ? REASONS[gesture.plan.reason]
      : message

  return (
    <>
      <section className="game-layout">
        <div className="pasture-card">
          <div className="board-topline">
            <span>🌼 はじまりの牧場</span>
            <span>7 × 7</span>
          </div>
          <div
            className="board-viewport"
            ref={viewport}
            data-testid="viewport"
            onPointerDown={down}
            onPointerMove={update}
            onPointerUp={up}
            onPointerCancel={(e) => {
              if (active.current?.pointerId === e.pointerId) cancel()
            }}
            onLostPointerCapture={(e) => {
              if (active.current?.pointerId === e.pointerId) cancel()
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="board-world"
              ref={world}
              data-testid="board"
              style={{ transform: `translate(${camera.x}px, ${camera.y}px)` }}
            >
              {Array.from({ length: game.bounds.width * game.bounds.height }, (_, index) => {
                const position = {
                  x: index % game.bounds.width,
                  y: Math.floor(index / game.bounds.width),
                }
                const slime = game.slimes.find((s) => samePosition(s.position, position))
                const group = plan?.groups.find((g) => slime && g.consumedIds.includes(slime.id))
                const outputGroup = plan?.groups.find((g) =>
                  g.outputs.some((p) => samePosition(p, position)),
                )
                const remainder = slime && plan?.remainderIds.includes(slime.id)
                return (
                  <button
                    key={index}
                    type="button"
                    className={`cell ${(position.x + position.y) % 2 ? 'alternate' : ''} ${group ? 'grouped' : ''} ${remainder ? 'remainder' : ''} ${selected && slime?.id === selected ? 'selected' : ''}`}
                    data-cell={`${position.x},${position.y}`}
                    data-slime-id={slime?.id}
                    data-tier={slime?.tier}
                    data-group={group?.number}
                    data-output={outputGroup?.number}
                    data-remainder={remainder ? 'true' : undefined}
                    aria-label={`${position.x + 1}列${position.y + 1}行${slime ? ` Tier ${slime.tier}` : ' 空きマス'}${group ? ` 組${group.number}` : ''}${remainder ? ' 余り・残ります' : ''}`}
                    style={
                      group
                        ? ({
                            '--group-color': GROUP_COLORS[(group.number - 1) % GROUP_COLORS.length],
                          } as CSSProperties)
                        : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      if (active.current) return
                      if (selected) {
                        commit(planDrop(gameRef.current, selected, position))
                        setSelected(null)
                      } else if (slime) setSelected(slime.id)
                    }}
                  >
                    {slime && (
                      <span
                        key={slime.id}
                        className={`slime-piece ${slime.id === dragged?.id ? 'source-ghost' : ''} ${createdIds.includes(slime.id) ? 'born' : ''}`}
                      >
                        <Slime tier={slime.tier} />
                      </span>
                    )}
                    {group && <span className="group-badge">{group.number}</span>}
                    {remainder && <span className="keep-badge">残る</span>}
                    {outputGroup && <span className="output-mark">↑{outputGroup.number}</span>}
                    {!slime && !outputGroup && (index === 6 || index === 43) && (
                      <span className="tiny-flower">✿</span>
                    )}
                  </button>
                )
              })}
            </div>
            {dragged && gesture && (
              <div
                className="drag-sprite"
                style={
                  {
                    left: gesture.current.x,
                    top: gesture.current.y,
                    '--group-color': plan ? GROUP_COLORS[0] : 'transparent',
                  } as CSSProperties
                }
              >
                <Slime tier={dragged.tier} />
                {plan && <span className="group-badge">1</span>}
              </div>
            )}
          </div>
          <div
            className={`result-bar ${plan ? 'preview-active' : ''}`}
            role="status"
            data-testid="status"
          >
            <span className="result-spark">{plan ? '✦' : '♡'}</span>
            <div>
              <strong>{previewText}</strong>
              {plan && (
                <small>
                  {plan.groups
                    .map((g) => `${g.number}組目 ${g.consumedIds.length}→${g.outputs.length}`)
                    .join(' ／ ')}
                  {plan.remainderIds.length ? ` ／ 余り${plan.remainderIds.length}体は残る` : ''}
                  <br />
                  ↑は出力予定セル。離すと確定します。
                </small>
              )}
            </div>
          </div>
          <div className="board-footer">
            <span>空きマスをドラッグで視点移動</span>
            <button
              type="button"
              onClick={() => {
                cancel()
                cameraRef.current = { x: 0, y: 0 }
                setCamera({ x: 0, y: 0 })
              }}
            >
              視点を戻す ↺
            </button>
          </div>
        </div>
        <aside className="side-panel">
          <section className="instruction-card">
            <span className="eyebrow">HOW TO MERGE</span>
            <h2>重ねて、ぷにっと。</h2>
            <p>
              同じTierの仲間へドラッグ。
              <br />
              指を離すと、ひとつ上に進化！
            </p>
            <div className="recipe">
              <span>3体</span>
              <span>→</span>
              <strong>1体</strong>
            </div>
            <div className="recipe best">
              <span>5体</span>
              <span>→</span>
              <strong>2体</strong>
              <small>1体おトク！</small>
            </div>
            <p className="hint">
              斜めにつながる仲間も対象。
              <br />
              近くに置くだけではマージしません。
            </p>
            <div className="legend">
              {GROUP_COLORS.slice(0, 3).map((color, i) => (
                <span key={color}>
                  <i style={{ background: color }} />組{i + 1}
                </span>
              ))}
              <span>点線＝残る</span>
            </div>
          </section>
          <section className="preset-card">
            <span className="eyebrow">PHASE 1 · TEST PLAY</span>
            <h2>おためし配置</h2>
            <p>何度でも、好きなマージを。</p>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={preset === p.id}
                  onClick={() => reset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button type="button" className="reset-button" onClick={() => reset('five')}>
              ↻ 最初の配置にリセット
            </button>
            <small>
              開発・検証用の配置です。切替・リセットで試遊履歴も初期化します。高Tier試験の最高到達Tierは
              {MAX_TIER}、ほかは1から。
            </small>
          </section>
        </aside>
      </section>
      <div className="session-stats">
        <span>
          牧場の仲間 <b data-testid="slime-count">{game.slimes.length}</b>体
        </span>
        <span>
          最高到達 <b data-testid="highest-tier">Tier {game.highestTierReached}</b>
        </span>
        <span>最終段階 Tier {MAX_TIER}</span>
      </div>
      <p className="footnote">
        Phase 1 試遊版 · Tier 4以降の見た目は仮デザイン · 保存機能は後続Phaseで追加予定
        <br />
        キーボード：Tabでマスへ移動 → Enter / Spaceで選択 →
        移動先で再度Enter。Escで選択・ドラッグを解除。
      </p>
    </>
  )
}
