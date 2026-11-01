import { useEffect, useRef, type ReactNode } from 'react'
import { MAX_TIER } from '../domain/game'
import { PRESETS, type PresetId } from '../app/presets'
import { Slime } from './Slime'
export type Panel = 'help' | 'presets' | 'appearance' | 'settings' | 'shop' | 'slime' | 'attributes'
const TITLES: Record<Panel, string> = { attributes: 'スライムの属性', help: '遊び方', presets: '検証用プリセット', appearance: 'スライム一覧・外見確認', settings: '表示設定', shop: 'GOLDショップ', slime: 'スライム詳細' }
export function GameMenu({ panel, onClose, preset, onPreset, reducedEffects, onEffects, onZoom, onResetCamera, extra, normal, onNormal }: {
  extra?: ReactNode; normal: boolean; onNormal: () => void
  panel: Panel | null; onClose: () => void; preset: PresetId; onPreset: (id: PresetId) => void
  reducedEffects: boolean; onEffects: (value: boolean) => void
  onZoom: (direction: -1 | 1) => void; onResetCamera: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal()
    else if (!panel && dialog.current?.open) dialog.current.close()
  }, [panel])
  return <dialog ref={dialog} className={`menu-dialog ${panel === 'appearance' ? 'appearance-dialog' : ''}`} aria-labelledby="menu-title"
    onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === dialog.current) {
      const rect = dialog.current.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose()
    } }}>
    <div className="panel-header"><h2 id="menu-title">{panel ? TITLES[panel] : ''}</h2><button type="button" aria-label="閉じる" onClick={onClose}>×</button></div>
    <div className={`panel-body ${reducedEffects ? 'reduced-effects' : ''}`}>
      {extra}
      {panel === 'help' && <>
        <p>マージできない占有マスへのドロップは位置交換（⇄点線枠）。マージが成立する場合は進化を優先します。</p><p>属性メニューで全10属性の効果・発動条件・Lv・上限・複合効果と個体詳細を確認できます。売却の上の属性解除へドロップすると無料で全属性を解除し、個体は元の位置に残ります。</p>
        <p>同じTierのスライムへ重ね、離すとマージします。</p>
        <div className="recipes"><strong>3体 → 上位1体</strong><strong>5体 → 上位2体</strong></div>
        <ul><li>縦・横・斜めの8方向で連結。5体優先、次に3体、余りは保持。</li><li>枠の番号＝マージ組、↑＝出力予定セル、点線＝残る個体。</li><li>空きマスへの移動・隣接だけではマージしません。</li><li>空きマスからドラッグでパン。ホイール / 2本指ピンチでズーム。</li><li>2本指になると素材ドラッグを取り消します。全ての指を離すと再操作できます。</li><li>Tabでマス移動 → Enter / Spaceで選択 → 移動先で再度Enter。Escapeで取消。</li></ul>
        <p>設定から拡大・縮小・表示リセットを操作できます。キーボードではTabで設定を選び、Enterで開いて操作します。</p>
        <p className="muted">時間で貯蔵→スライム追加を1回押すとランダムな空きマスへ1体配置。加速は生成待ち時間を短縮します。売却エリアへドロップすると即売却。右クリック／長押し（約500ms）で売却保護。Pキーでも保護、Iキーで詳細。Enterで個体選択後、売却エリアへTab→Enterでも売却できます。選択後に属性解除へTab→Enterでも無料解除できます。保護は売却だけを防ぎ、属性解除やマージは妨げません。金マスから対象を動かすと残り報酬は失効します。ショップで強化できます。通常プレイは自動保存されます。</p>
      </>}
      {panel === 'presets' && <>
        <p>7×7検証セッションへ切り替えます。通常4×4プレイの保存には影響しません。</p><button type="button" className="reset-button" onClick={onNormal}>通常プレイへ戻る</button>
        <div className="preset-grid">{PRESETS.map(p => <button type="button" key={p.id} aria-pressed={preset === p.id} onClick={() => onPreset(p.id)}>{p.label}</button>)}</div>
        <button type="button" className="reset-button" onClick={() => onPreset('five')}>盤面リセット</button>
        <p className="muted">高Tier試験：Tier 39→40とTier 40上限。通常配置の最高到達Tierは1、高Tier配置は40。</p>
      </>}
      {panel === 'appearance' && <>
        <p className="muted">全40段階のデザイン試作です。正式な配色・名称・完成イラストの承認とは別です。</p>
        {[['通常・単色', 1], ['模様', 11], ['宝石・発光', 21], ['星・カオス・超越', 31]].map(([label, start]) => <section key={start} className="tier-section"><h3>{label} · Tier {start}〜{Number(start) + 9}</h3><div className="tier-gallery">{Array.from({ length: 10 }, (_, i) => Number(start) + i).map(tier => <figure key={tier} data-preview-tier={tier}><div className="gallery-slime"><Slime tier={tier} /></div><figcaption>Tier {tier}{tier === 30 ? ' · 虹' : tier === MAX_TIER ? ' · 最終' : ''}</figcaption></figure>)}</div></section>)}
      </>}
      {panel === 'settings' && <>
        <div className="camera-actions" role="group" aria-label="表示操作">
          <button type="button" aria-label="縮小" onClick={() => onZoom(-1)}>−</button>
          <button type="button" aria-label="拡大" onClick={() => onZoom(1)}>＋</button>
          <button type="button" data-testid="reset-camera" onClick={onResetCamera}>表示リセット</button>
        </div>
        <label className="setting-row"><input type="checkbox" checked={reducedEffects} onChange={e => onEffects(e.target.checked)} />発光・進化アニメーションを軽減</label>
        <p className="muted">OSのモーション削減設定にも対応します。{normal ? '通常プレイの表示設定は保存されます。' : '検証モードの表示設定は保存されません。'}</p>
        <p>ズーム：75〜300%。100%は盤面全体が見えるフィット表示。画面サイズ変更時は表示をリセットします。</p>
      </>}
    </div>
  </dialog>
}


