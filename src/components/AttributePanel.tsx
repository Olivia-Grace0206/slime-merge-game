import type { GameState } from '../domain/game'
import { boardEffects } from '../core/attributes/effects'
import { sessionRules, type Session } from '../core/progression/session'
import { attributeGuide, COMBINATIONS, percent } from './attributeGuide'
import { AttributeIcon } from './AttributeIcon'
import { AttributeTokens } from './AttributeBadges'
export function AttributePanel({game,session,onDetail}:{game:GameState;session:Session;onDetail:(id:string)=>void}){
 const effects=boardEffects(game),guide=attributeGuide()
 return <>
  <p>10属性の効果を、未所持でも確認できます。数値は調整中の仮設定です。</p>
  <section aria-labelledby="active-effects-title"><h3 id="active-effects-title">現在の盤面の属性効果</h3>
   <p data-testid="support-summary">通常属性率 {percent(effects.normalChance)} / 属性重視 {percent(effects.focusChance)} · 氷 −{percent(effects.iceReduction)} / 雷 +{percent(effects.tapBonus)} · 自然 {effects.natureIntervalMs?`${(effects.natureIntervalMs/1000).toFixed(0)}秒/体`:'なし'} · 追加生成累計 {session.nature.totalGenerated}体 · 通常プレイの生成 {(sessionRules(session).intervalMs/1000).toFixed(1)}秒</p>
  </section>
  <section aria-labelledby="roster-title"><h3 id="roster-title">スライムごとの属性詳細</h3><div className="attribute-roster">{game.slimes.map(s=><button type="button" key={s.id} onClick={()=>onDetail(s.id)}><b>Tier {s.tier} · {s.position.x+1}列{s.position.y+1}行</b><AttributeTokens attributes={s.attributes}/></button>)}{!game.slimes.length&&<p>盤面にスライムを追加してください。</p>}</div></section>
  <section aria-labelledby="attribute-guide-title" data-testid="attribute-guide"><h3 id="attribute-guide-title">属性効果一覧</h3><p className="muted">名前を開くと、効果・発動条件・Lv補正・上限を表示します。有効pはLv効果に隣接光の支援を含む値です。</p>
   <div className="attribute-guide">{guide.map(entry=><details className={`attribute-card attribute-${entry.id}`} key={entry.id} data-testid={`guide-${entry.id}`}><summary><AttributeIcon id={entry.id}/><strong>{entry.name}</strong><small>{entry.condition}</small></summary><div><p><b>基本効果：</b>{entry.effect}</p><p><b>Lv補正：</b>{entry.growth}</p><p><b>上限・制約：</b>{entry.limit}</p><p className="muted">{entry.note}</p></div></details>)}</div>
  </section>
  <section aria-labelledby="combination-title" data-testid="combination-guide"><h3 id="combination-title">複合効果</h3><p>同じ個体の元の属性を保持し、各組み合わせを1回ずつ追加適用します。</p>{COMBINATIONS.map(c=><article className="combination-card" key={c.name}><h4>{c.ids.map(id=><AttributeIcon key={id} id={id}/>)} {c.name}</h4><p>{c.description()}</p></article>)}</section>
  <p className="muted">属性重視：属性付き・高Tierを含め、例外なく貯蔵FIFO先頭10体を消費します。出力は素材の最低Tier、既存属性も失われ、新しい属性は抽選（確定保証なし）。</p>
  <p className="muted">属性解除は無料で全属性を外し、個体・Tier・位置・売却保護を保持します。自然の最後の供給源を解除すると追加生成は停止します。</p>
  <p className="muted">覚醒・紫マス・青マスの共鳴は未実装です。</p>
 </>
}
