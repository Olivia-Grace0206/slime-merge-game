import { useState } from 'react'
import { ATTRIBUTE_IDS, type AttributeId } from '../domain/attributes'
import type { GameState } from '../domain/game'
import { effectContext } from '../core/special/state'
import { AWAKENING_MULTIPLIERS, BLUE_MULTIPLIERS, AWAKENED_DARK_LOSS, SPECIAL_TIMING } from '../core/special/config'
import { boardEffects } from '../core/attributes/effects'
import { sessionRules, type Session } from '../core/progression/session'
import { attributeGuide, COMBINATIONS, percent } from './attributeGuide'
import { AttributeIcon } from './AttributeIcon'
import { AttributeTokens } from './AttributeBadges'
import { ATTRIBUTE_INTRO } from './attributeIntro'

type View = 'overview' | 'detail' | 'roster'

export function AttributePanel({ game, session, onDetail }: {
  game: GameState; session: Session; onDetail: (id: string) => void
}) {
  const [view, setView] = useState<View>('overview')
  const [selected, setSelected] = useState<AttributeId>('fire')
  const guide = attributeGuide()
  const entry = guide.find(item => item.id === selected)!
  const effects = boardEffects(game, effectContext(session))
  const relatedCombos = COMBINATIONS.filter(combination => combination.ids.some(id => id === selected))

  function openAttribute(id: AttributeId) {
    setSelected(id)
    setView('detail')
  }

  return <div className="attribute-introduction" data-testid="attribute-introduction" data-view={view}>
    {view === 'overview' && <>
      <p className="attribute-intro-lead">全10属性をひと目で。気になる属性を選ぶと詳しい効果が分かります。</p>
      <div className="attribute-intro-grid" data-testid="attribute-guide" aria-label="全10属性の紹介">
        {guide.map(item => (
          <button type="button" key={item.id}
            className={`attribute-card attribute-intro-card attribute-${item.id}`}
            data-testid={`guide-${item.id}`} data-attribute={item.id}
            aria-label={`${item.name}の詳細を表示`}
            onClick={() => openAttribute(item.id)}>
            <AttributeIcon id={item.id} />
            <strong>{item.name}</strong>
            <small>{ATTRIBUTE_INTRO[item.id]}</small>
            <span className="attribute-intro-more">詳しく見る ›</span>
          </button>
        ))}
      </div>
      <div className="attribute-intro-footer">
        <span>★ 覚醒で強化 ／ 青マスで一時共鳴（支援7属性）</span>
        <button type="button" data-testid="attribute-roster-open" onClick={() => setView('roster')}>
          現在の効果・所持スライム
        </button>
      </div>
    </>}

    {view === 'detail' && <div className="attribute-info-detail" data-testid="attribute-info-detail">
      <button type="button" className="attribute-back" onClick={() => setView('overview')}>‹ 10属性一覧へ戻る</button>
      <div className={`attribute-detail-hero attribute-${entry.id}`}>
        <AttributeIcon id={entry.id} />
        <div>
          <h3>{entry.name}</h3>
          <p>{ATTRIBUTE_INTRO[entry.id]}</p>
        </div>
        <span>{entry.condition}</span>
      </div>
      <section>
        <h4>どんな効果？</h4>
        <p>{entry.effect}</p>
      </section>
      <section>
        <h4>Lvを上げると？</h4>
        <p>{entry.growth}</p>
      </section>
      <section>
        <h4>★ 覚醒でどう変わる？</h4>
        <p>この属性の効果の強さ（power）が <b>×{AWAKENING_MULTIPLIERS[entry.id].toFixed(2)}</b> に。属性Lv・効果上限はそのままです。</p>
        {entry.id === 'dark' && <p>覚醒した闇はマージ時に仮{percent(AWAKENED_DARK_LOSS)}/組の消失リスクがあります。スライム本体は消えません。</p>}
      </section>
      <section>
        <h4>≋ 青マスでの共鳴</h4>
        <p>{BLUE_MULTIPLIERS[entry.id] === 1
          ? '売却系の属性は青共鳴の対象外です。'
          : `青マスにいる間だけ効果の強さがさらに ×${BLUE_MULTIPLIERS[entry.id].toFixed(2)}。離れたら元に戻ります。`}</p>
      </section>
      <section>
        <h4>上限・注意点</h4>
        <p>{entry.limit}</p>
        <p className="muted">{entry.note}</p>
      </section>
      {relatedCombos.length > 0 && <section data-testid="attribute-detail-combos">
        <h4>相性のよい属性</h4>
        {relatedCombos.map(combination => <div key={combination.name} className="attribute-detail-combo">
          <strong>{combination.name}</strong><p>{combination.description()}</p>
        </div>)}
      </section>}
      <nav className="attribute-detail-nav" aria-label="ほかの属性も見る">
        {ATTRIBUTE_IDS.filter(id => id !== selected).map(id => (
          <button type="button" key={id} onClick={() => openAttribute(id)}>
            <AttributeIcon id={id} /><span>{guide.find(item => item.id === id)!.name}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="attribute-back" onClick={() => setView('overview')}>‹ 属性一覧へ戻る</button>
    </div>}

    {view === 'roster' && <div className="attribute-roster-screen" data-testid="attribute-roster-screen">
      <button type="button" className="attribute-back" onClick={() => setView('overview')}>‹ 10属性一覧へ戻る</button>
      <section aria-labelledby="active-effects-title">
        <h3 id="active-effects-title">現在の盤面の属性効果</h3>
        <p data-testid="support-summary">通常属性率 {percent(effects.normalChance)} / 属性重視 {percent(effects.focusChance)} · 氷 −{percent(effects.iceReduction)} / 雷 +{percent(effects.tapBonus)} · 自然 {effects.natureIntervalMs ? `${(effects.natureIntervalMs / 1000).toFixed(0)}秒/体` : 'なし'} · 追加生成累計 {session.nature.totalGenerated}体 · 通常プレイの生成 {(sessionRules(session).intervalMs / 1000).toFixed(1)}秒</p>
      </section>
      <section aria-labelledby="roster-title">
        <h3 id="roster-title">スライムごとの属性詳細</h3>
        <div className="attribute-roster">
          {game.slimes.map(slime => <button type="button" key={slime.id} onClick={() => onDetail(slime.id)}>
            <b>Tier {slime.tier} · {slime.position.x + 1}列{slime.position.y + 1}行</b>
            <AttributeTokens attributes={slime.attributes}/>
          </button>)}
          {!game.slimes.length && <p>盤面にスライムを追加してください。</p>}
        </div>
      </section>
      <section data-testid="special-guide">
        <h3>紫の覚醒・青の共鳴</h3>
        <p>紫は未覚醒属性1種類を仮{SPECIAL_TIMING.purpleChargeMs / 1000}秒で永続覚醒。離脱すると進捗0です。青は仮{SPECIAL_TIMING.blueLifetimeMs / 1000}秒、支援7属性を配置中だけ強化します。</p>
        <p>覚醒は第1出力へ集中し、増殖しません。余剰だけ事前に文章で警告して消失します。警告中もマージできます。余剰覚醒の消失は確定、闇属性の消失は組単位の確率判定であり、別の処理です。</p>
        {session.specials.lastAwakening && <p>最近の覚醒：{guide.find(item => item.id === session.specials.lastAwakening?.attributeId)?.name}★</p>}
      </section>
      <section data-testid="combination-guide">
        <h3>複合効果</h3>
        {COMBINATIONS.map(combo => <article className="combination-card" key={combo.name}>
          <h4>{combo.ids.map(id => <AttributeIcon key={id} id={id} />)} {combo.name}</h4><p>{combo.description()}</p>
        </article>)}
      </section>
      <p className="muted">属性重視は貯蔵FIFO先頭10体を消費。属性付き・高Tierも先頭10体の消費対象で、出力は最低Tier・属性は再抽選（保証なし）。無料属性解除では覚醒も含む全属性を外し、個体・Tier・元の位置・売却保護・GOLDを保持します。</p>
    </div>}
  </div>
}
