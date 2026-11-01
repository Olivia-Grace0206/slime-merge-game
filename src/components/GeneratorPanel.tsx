import { useEffect, useRef } from 'react'
import { sessionRules, type Session } from '../core/progression/session'
import { FOCUS_COST } from '../core/progression/focus'
import { SlimeTrio, StorageBox } from './ProgressIcons'

/** Presentation only: never creates stock, dispatches commands or writes storage. */
export function GeneratorPanel({ session, disabled, fullBoard, onAdd, onTap, onMode }: {
  session: Session; disabled: boolean; fullBoard: boolean; onAdd: () => void; onTap: () => void; onMode: () => void
}) {
  const bar = useRef<HTMLProgressElement>(null), time = useRef<HTMLSpanElement>(null)
  const rules = sessionRules(session), full = session.generator.storedTiers.length >= rules.capacity
  const focused = session.generationMode === 'focused'
  const unavailable = focused ? session.generator.storedTiers.length < FOCUS_COST : !session.generator.storedTiers.length
  useEffect(() => {
    let frame = 0, previous = -Infinity
    const paint = (stamp: number) => {
      if (document.hidden) return
      if (stamp - previous >= 32) {
        const progress = full ? rules.intervalMs : Math.min(rules.intervalMs, session.generator.progressMs + (disabled ? 0 : Math.max(0, Date.now() - session.generator.updatedAtMs)))
        if (bar.current) bar.current.value = progress
        if (time.current) time.current.textContent = full ? '満杯・生成停止' : `次まで ${((rules.intervalMs - progress) / 1000).toFixed(1)}秒`
        previous = stamp
      }
      if (!full && !disabled) frame = requestAnimationFrame(paint)
    }
    const sync = () => { cancelAnimationFrame(frame); previous = -Infinity; if (!document.hidden) frame = requestAnimationFrame(paint) }
    sync(); document.addEventListener('visibilitychange', sync)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', sync) }
  }, [session, disabled, full, rules.intervalMs])
  return <section className={`generator-panel ${full ? 'storage-full' : ''}`} aria-label="スライム生成装置">
    <h2><span aria-hidden="true">✦</span> スライム生成</h2>
    <button type="button" data-testid="add-slime" className="add-button" title={focused ? '属性付き・高Tierを含む貯蔵先頭10体を消費します' : '貯蔵先頭1体を追加します'} disabled={disabled || fullBoard || unavailable} onClick={onAdd}>
      <span className="generator-mascot"><SlimeTrio /></span>
      <span className="add-label">{focused ? <>属性重視<small>10体→1体</small></> : '＋ スライム追加'}</span>
      <small>{fullBoard ? '空きマスがありません' : focused ? '貯蔵10体で使用可能' : session.generator.storedTiers.length ? 'ランダムな空きマスへ' : '生成を待っています'}</small>
    </button>
    <div className="generator-readout"><span className="storage-count"><StorageBox /><b data-testid="storage-count">{session.generator.storedTiers.length} / {rules.capacity}</b></span>
      <span ref={time} data-testid="generation-time">{full ? '満杯・生成停止' : `次まで ${((rules.intervalMs - session.generator.progressMs) / 1000).toFixed(1)}秒`}</span>
      <progress ref={bar} aria-label="生成進捗" max={rules.intervalMs} value={full ? rules.intervalMs : session.generator.progressMs} />
    </div>
    <div className="generator-actions"><button type="button" className="accelerate-button" disabled={disabled || full} onClick={onTap}>⚡ 生成加速<small>−{(rules.tapAdvanceMs / 1000).toFixed(1)}秒</small></button><button type="button" className="mode-button" data-testid="generation-mode" aria-label={`生成モード：${focused ? '属性重視' : '通常'}・押して切り替え`} aria-pressed={focused} disabled={disabled} onClick={onMode}>{focused ? '属性' : '通常'}<small>切替</small></button></div>
  </section>
}
